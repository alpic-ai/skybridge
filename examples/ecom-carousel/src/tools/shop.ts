import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { InputRequest } from "@modelcontextprotocol/server";
import { inputRequired, type McpExtra, type McpServer } from "skybridge/server";
import { z } from "zod";
import { CAROUSEL_MAX_SIZE } from "../config.js";
import { fetchSearch } from "../lib/medusa.js";
import { readPreferences, scopes } from "../lib/preferences.js";
import {
  carouselView,
  getProducts,
  type Product,
  renderCarouselHandler,
  toStructuredContent,
} from "./render-carousel.js";
import { searchProductsHandler } from "./search-products.js";

const readOnly = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
};
const shopIcon = {
  src: `data:image/svg+xml;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 7h14l1 14H4L5 7Z"/><path d="M8 7V5a4 4 0 0 1 8 0v2"/></svg>').toString("base64")}`,
  mimeType: "image/svg+xml",
};
export const shopIcons = [shopIcon];
const shopInputShape = {
  action: z
    .enum(["browse", "search", "carousel", "choose"])
    .default("browse")
    .describe(
      "browse opens the workspace; search visibly presents matching products; carousel presents curated ids; choose asks a native illustrated product choice. My Kit is a tab in the workspace.",
    ),
  keyword: z.string().optional(),
  category: z.enum(["apparel", "goggles", "skis"]).optional(),
  sort: z.enum(["price-asc", "price-desc", "newest", "name"]).optional(),
  ids: z
    .array(z.string())
    .min(1)
    .max(8)
    .optional()
    .describe(
      "Required for carousel and choose. Carousel supports up to three curated products.",
    ),
  productId: z.string().optional(),
};
const shopInputSchema = z.object(shopInputShape).superRefine((input, ctx) => {
  if (
    (input.action === "carousel" || input.action === "choose") &&
    !input.ids
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["ids"],
      message: "Supply product ids for carousel or choose.",
    });
  }
  if (
    input.action === "carousel" &&
    (input.ids?.length ?? 0) > CAROUSEL_MAX_SIZE
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["ids"],
      message: `Select at most ${CAROUSEL_MAX_SIZE} carousel products.`,
    });
  }
});
export const shopDefinition = {
  name: "shop" as const,
  title: "Skybridge Shop",
  icons: shopIcons,
  description:
    "Browse and search the winter-sports catalogue, display curated products, or ask the shopper to choose a product. My Kit is available inside the Shop workspace. Search always presents a visible carousel with factual product grounding. Call once to search and present; there is no separate data-only search tool. Empty input opens the Shop workspace. Purchases use the external storefront.",
  inputSchema: shopInputShape,
  annotations: readOnly,
  openai: {
    entrypoints: [{ type: "global" as const }, { type: "thread" as const }],
    availableDisplayModes: ["inline" as const, "fullscreen" as const],
    preferredDisplayMode: "fullscreen" as const,
  },
  view: {
    ...carouselView,
    component: "shop" as const,
  },
};
type ShopInput = z.input<typeof shopInputSchema>;
function commonMetadata(
  products: Product[],
  categories: Record<string, string>,
  extra: McpExtra,
  presentation: "carousel" | "workspace",
) {
  const scope = scopes(extra);
  return {
    products,
    categories,
    preferences: readPreferences(scope.preferences),
    pluginId: process.env.CHATGPT_PLUGIN_ID ?? null,
    presentation,
    selectedProductId: null as string | null,
  };
}
export async function shopHandler(input: ShopInput, extra: McpExtra) {
  const args = shopInputSchema.parse(input);
  if (args.action === "choose") {
    const result = await chooseKitProductHandler(
      { ids: args.ids ?? [] },
      extra,
    );
    return result;
  }
  if (args.action === "carousel") {
    const result = await renderCarouselHandler({ ids: args.ids ?? [] });
    return {
      ...result,
      structuredContent: {
        ...result.structuredContent,
        status: "ready",
        productId: null,
      },
      _meta: commonMetadata(result._meta.products, {}, extra, "carousel"),
    };
  }
  if (args.action === "search") {
    const searched = await searchProductsHandler({
      keyword: args.keyword ?? "",
      category: args.category,
      sort: args.sort,
    });
    const matches = searched.structuredContent.products;
    const products = matches.length
      ? await getProducts(
          matches.slice(0, CAROUSEL_MAX_SIZE).map((product) => product.id),
        )
      : [];
    const categories = Object.fromEntries(
      matches.map((product) => [product.id, product.category ?? ""]),
    );
    return {
      _meta: commonMetadata(products, categories, extra, "carousel"),
      structuredContent: {
        ...toStructuredContent(products),
        status: "ready",
        productId: args.productId ?? null,
      },
      content: [
        {
          type: "text" as const,
          text: products.length
            ? "Matching products are displayed. Ground recommendations in these catalogue facts and their displayed order."
            : "No matching products. Try a broader keyword or remove the category filter.",
        },
      ],
    };
  }
  const { products, categories } = await catalogue(args);
  return {
    _meta: commonMetadata(products, categories, extra, "workspace"),
    structuredContent: {
      ...toStructuredContent(products),
      status: "ready",
      productId: args.productId ?? null,
    },
    content: [
      {
        type: "text" as const,
        text: "Shop ready. Browse products and choose variants; purchases use the external storefront.",
      },
    ],
  };
}

async function catalogue(input: {
  keyword?: string;
  category?: string;
  productId?: string;
}) {
  const { products: raw } = await fetchSearch(input);
  const ids = input.productId ? [input.productId] : raw.map((p) => p.id);
  return {
    products: ids.length ? await getProducts(ids) : [],
    categories: Object.fromEntries(
      raw.map((p) => [
        p.id,
        p.categories?.[0]?.handle ?? p.categories?.[0]?.name ?? "",
      ]),
    ),
  };
}

const formStateKey = randomBytes(32);
const formStateSchema = z.object({
  ids: z.array(z.string()).min(1).max(8),
  scope: z.string().nullable(),
  expires: z.number(),
});
function signFormState(ids: string[], extra: McpExtra) {
  const payload = Buffer.from(
    JSON.stringify({
      ids,
      scope: scopes(extra).form,
      expires: Date.now() + 600_000,
    }),
  ).toString("base64url");
  return `${payload}.${createHmac("sha256", formStateKey).update(payload).digest("base64url")}`;
}
function verifyFormState(value: unknown, extra: McpExtra) {
  if (typeof value !== "string") {
    throw new Error("Missing product choice state. Start the choice again.");
  }
  const [payload, signature] = value.split(".");
  if (!payload || !signature) {
    throw new Error("Invalid product choice state.");
  }
  const expected = createHmac("sha256", formStateKey).update(payload).digest();
  const actual = Buffer.from(signature, "base64url");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new Error("Invalid product choice state.");
  }
  const state = formStateSchema.parse(
    JSON.parse(Buffer.from(payload, "base64url").toString()),
  );
  if (state.expires < Date.now() || state.scope !== scopes(extra).form) {
    throw new Error("Product choice expired or belongs to another session.");
  }
  return state;
}
type ChoiceThumbnail = { src: string; mimeType?: string };
async function choiceThumbnails(products: Product[]) {
  const entries = await Promise.all(
    products.map(async (product) => {
      const src = product.card.media[0];
      if (!src?.startsWith("https://")) {
        return [product.id, undefined] as const;
      }
      try {
        const response = await fetch(src, {
          signal: AbortSignal.timeout(3000),
        });
        const mimeType = response.headers.get("content-type")?.split(";")[0];
        if (
          response.ok &&
          mimeType &&
          ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(
            mimeType,
          )
        ) {
          const bytes = Buffer.from(await response.arrayBuffer());
          if (bytes.length <= 256_000) {
            return [
              product.id,
              {
                src: `data:${mimeType};base64,${bytes.toString("base64")}`,
                mimeType,
              },
            ] as const;
          }
        }
      } catch {
        // Keep the catalogue URL if thumbnail fetching is unavailable.
      }
      return [product.id, { src }] as const;
    }),
  );
  return new Map<string, ChoiceThumbnail | undefined>(entries);
}
function choiceForm(
  products: Product[],
  thumbnails?: Map<string, ChoiceThumbnail | undefined>,
) {
  return {
    mode: "form",
    message: "Choose a product to explore for your ski kit.",
    requestedSchema: {
      type: "object",
      required: ["productId"],
      properties: {
        productId: {
          type: "string",
          title: "Product",
          oneOf: products.map((p) => ({
            const: p.id,
            title: p.card.title,
            description:
              p.card.description ?? "View available variants in the Shop.",
            ...(p.card.media[0]?.startsWith("https://")
              ? {
                  "x-openai-thumbnail": thumbnails?.get(p.id) ?? {
                    src: p.card.media[0],
                  },
                }
              : {}),
          })),
        },
      },
    },
  };
}
function supportsRichForm(extra: McpExtra) {
  // MCP v2 currently emits an empty RequestMetaEnvelope declaration, although
  // runtime envelopes carry these standard wire keys.
  const envelope = extra.mcpReq.envelope as Record<string, unknown> | undefined;
  const capabilities = envelope?.[
    "io.modelcontextprotocol/clientCapabilities"
  ] as { extensions?: Record<string, unknown> } | undefined;
  const extensions = capabilities?.extensions;
  const elicitation = extensions?.["openai/elicitation"];
  return (
    envelope?.["io.modelcontextprotocol/protocolVersion"] === "2026-07-28" &&
    typeof elicitation === "object" &&
    elicitation !== null &&
    "form" in elicitation
  );
}
async function chooseKitProductHandler(
  { ids }: { ids: string[] },
  extra: McpExtra,
) {
  const response = extra.mcpReq.inputResponses?.["kit-product"];
  const offeredIds =
    response === undefined
      ? ids
      : verifyFormState(extra.mcpReq.requestState(), extra).ids;
  const products = await getProducts(offeredIds);
  if (response !== undefined) {
    const result = z
      .object({
        action: z.enum(["accept", "decline", "cancel"]),
        content: z.object({ productId: z.string() }).optional(),
      })
      .parse(response);
    if (result.action !== "accept") {
      return {
        content: "Product choice cancelled. The kit is unchanged.",
        structuredContent: {
          ...toStructuredContent(products),
          status: "cancelled",
          productId: null,
        },
        _meta: commonMetadata(products, {}, extra, "workspace"),
      };
    }
    const selected = products.find((p) => p.id === result.content?.productId);
    if (!selected) {
      throw new Error("Choose one of the offered catalogue products.");
    }
    return {
      content:
        "Product selected. Choose its exact variant in the Shop before adding it to My Kit.",
      structuredContent: {
        ...toStructuredContent(products),
        status: "selected",
        productId: selected.id,
      },
      _meta: {
        ...commonMetadata(products, {}, extra, "workspace"),
        selectedProductId: selected.id,
      },
    };
  }
  if (!products.length || !supportsRichForm(extra)) {
    return {
      content:
        "Native rich forms are unavailable on this host. Choose a product and exact variant in the Shop workspace.",
      structuredContent: {
        status: "fallback",
        productId: null,
        products: toStructuredContent(products).products,
      },
      _meta: commonMetadata(products, {}, extra, "workspace"),
    };
  }
  // The narrow tools/call adapter below translates this after MCP v2's
  // standard-method seam has validated the MRTR envelope and capabilities.
  const request = {
    method: "elicitation/create",
    params: choiceForm(products, await choiceThumbnails(products)),
  };
  return {
    ...inputRequired({
      inputRequests: { "kit-product": request as unknown as InputRequest },
      requestState: signFormState(
        products.map((p) => p.id),
        extra,
      ),
    }),
    content: [],
    _meta: commonMetadata(products, {}, extra, "workspace"),
  };
}

export function registerRichFormAdapter(server: McpServer) {
  server.mcpMiddleware("tools/call", async (request, extra, next) => {
    if (
      request.params.name !== "shop" ||
      (request.params.arguments as { action?: string } | undefined)?.action !==
        "choose" ||
      !extra ||
      !supportsRichForm(extra)
    ) {
      return next();
    }
    const envelope = extra.mcpReq.envelope as Record<string, unknown>;
    const key = "io.modelcontextprotocol/clientCapabilities";
    const previous = envelope[key] as Record<string, unknown>;
    // The host declared OpenAI form support. Present its equivalent standard
    // form capability to v2's internal standard-method validation only.
    envelope[key] = { ...previous, elicitation: { form: {} } };
    try {
      const result = await next();
      if (
        typeof result === "object" &&
        result !== null &&
        "inputRequests" in result
      ) {
        const requests = result.inputRequests as Record<
          string,
          { method: string; params: unknown }
        >;
        if (requests["kit-product"]?.method === "elicitation/create") {
          requests["kit-product"].method = "openai/elicitation/create";
        }
      }
      return result;
    } finally {
      envelope[key] = previous;
    }
  });
}
