import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import {
  type InputRequest,
  ResourceTemplate,
} from "@modelcontextprotocol/server";
import { inputRequired, type McpExtra, type McpServer } from "skybridge/server";
import { z } from "zod";
import { CAROUSEL_MAX_SIZE } from "../config.js";
import { fetchSearch } from "../lib/medusa.js";
import {
  preferenceShape,
  readPreferences,
  scopes,
  updatePreferences,
} from "../lib/preferences.js";
import {
  carouselView,
  getProducts,
  type Product,
  renderCarouselHandler,
  toStructuredContent,
} from "./render-carousel.js";
import { searchProductsHandler } from "./search-products.js";

export const settingsCapability = {
  readTool: "settings-read",
  updateTool: "settings-update",
};
const appOnly = { ui: { visibility: ["app" as const] } };
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
export const shopInputShape = {
  action: z
    .enum(["browse", "search", "carousel", "kit", "choose"])
    .default("browse")
    .describe(
      "browse opens the workspace; search visibly presents matching products; carousel presents curated ids; kit shows My Kit; choose asks a native illustrated product choice.",
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
export const shopInputSchema = z
  .object(shopInputShape)
  .superRefine((input, ctx) => {
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
    "Browse and search the winter-sports catalogue, display curated products, open My Kit, or ask the shopper to choose a product. Search always presents a visible carousel with factual product grounding. Call once to search and present; there is no separate data-only search tool. Empty input opens the Shop workspace. Purchases use the external storefront.",
  inputSchema: shopInputShape,
  annotations: readOnly,
  view: {
    ...carouselView,
    component: "shop" as const,
  },
  openai: {
    entrypoints: [{ type: "global" as const }, { type: "thread" as const }],
    availableDisplayModes: ["inline" as const, "fullscreen" as const],
    preferredDisplayMode: "fullscreen" as const,
  },
};
type ShopInput = z.input<typeof shopInputSchema>;
function commonMetadata(
  products: Product[],
  categories: Record<string, string>,
  extra: McpExtra,
  presentation: "carousel" | "kit" | "workspace",
) {
  const scope = scopes(extra);
  return {
    products,
    categories,
    preferences: readPreferences(scope.preferences),
    kitScope: scope.kit,
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
  const { products, categories } = await catalogue(
    args.action === "kit" ? {} : args,
  );
  return {
    _meta: commonMetadata(
      products,
      categories,
      extra,
      args.action === "kit" ? "kit" : "workspace",
    ),
    structuredContent: {
      ...toStructuredContent(products),
      status: "ready",
      productId: args.productId ?? null,
    },
    content: [
      {
        type: "text" as const,
        text:
          args.action === "kit"
            ? "My Kit is ready. Exact variants and quantities are stored locally for this conversation in this demo."
            : "Shop ready. Browse products and choose variants; purchases use the external storefront.",
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

export const settingsReadDefinition = {
  name: "settings-read" as const,
  inputSchema: {},
  annotations: readOnly,
  _meta: appOnly,
  description:
    "Read effective size and colour preferences for this host subject/session.",
  outputSchema: {
    schema: z.object({
      type: z.literal("object"),
      additionalProperties: z.boolean(),
      properties: z.object({
        size: z.object({
          type: z.literal("string"),
          title: z.string(),
          enum: z.array(z.string()),
          description: z.string(),
        }),
        color: z.object({
          type: z.literal("string"),
          title: z.string(),
          maxLength: z.number(),
          description: z.string(),
        }),
      }),
      required: z.array(z.string()),
    }),
    layout: z.array(
      z.object({
        kind: z.literal("group"),
        title: z.string(),
        items: z.array(
          z.object({
            kind: z.literal("property"),
            property: z.enum(["size", "color"]),
          }),
        ),
      }),
    ),
    values: z.strictObject(preferenceShape),
  },
};
export function settingsReadHandler(
  _input: Record<string, never>,
  extra: McpExtra,
) {
  return {
    content: [],
    structuredContent: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          size: {
            type: "string",
            title: "Preferred apparel size",
            enum: ["", "XS", "S", "M", "L", "XL", "XXL"],
            description:
              "Blank means no preference. Used only when a matching variant exists.",
          },
          color: {
            type: "string",
            title: "Preferred colour",
            maxLength: 80,
            description: "Used only when a matching variant exists.",
          },
        },
        required: ["size", "color"],
      },
      layout: [
        {
          kind: "group",
          title: "Shopping preferences",
          items: [
            { kind: "property", property: "size" },
            { kind: "property", property: "color" },
          ],
        },
      ],
      values: readPreferences(scopes(extra).preferences),
    },
  };
}
export const settingsSetSchema = z
  .strictObject(preferenceShape)
  .partial()
  .refine((set) => Object.keys(set).length > 0, "Set at least one preference.")
  .meta({ minProperties: 1 });
export const settingsUpdateDefinition = {
  name: "settings-update" as const,
  inputSchema: { set: settingsSetSchema },
  _meta: appOnly,
  description:
    "Update supplied preferences, preserving omitted values. Demo storage lasts until server restart.",
  outputSchema: { values: z.strictObject(preferenceShape) },
};
export function settingsUpdateHandler(
  { set }: { set: z.infer<typeof settingsSetSchema> },
  extra: McpExtra,
) {
  return {
    content: [],
    structuredContent: {
      values: updatePreferences(scopes(extra).preferences, set),
    },
  };
}

export const productUri = (id: string) =>
  `product://catalog/${encodeURIComponent(id)}`;
export function mentionItems(products: Product[]) {
  return products.map((p) => ({
    type: "resource_link" as const,
    uri: productUri(p.id),
    name: p.card.title,
    description: p.card.description ?? "Skybridge winter-sports product",
    mimeType: "application/json",
    ...(p.card.media[0]?.startsWith("https://")
      ? { icons: [{ src: p.card.media[0] }] }
      : {}),
  }));
}
export const mentionsConfig = {
  name: "search-mentions",
  description: "Find factual catalogue products for composer mentions.",
  handler: async ({ query }: { query: string }) => {
    const { products } = await catalogue({ keyword: query });
    return { items: mentionItems(products.slice(0, 20)) };
  },
};
export function registerProductResources(server: McpServer) {
  server.registerResource(
    "catalog-product",
    new ResourceTemplate("product://catalog/{id}", { list: undefined }),
    {
      mimeType: "application/json",
      description:
        "Factual product details and available variants from the live catalogue.",
    },
    async (uri, variables) => {
      if (typeof variables.id !== "string") {
        throw new Error("Invalid product identifier.");
      }
      const products = await getProducts([variables.id]);
      if (!products[0]) {
        throw new Error("Product not found.");
      }
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(products[0]),
          },
        ],
      };
    },
  );
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
      scope: scopes(extra).kit,
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
  if (state.expires < Date.now() || state.scope !== scopes(extra).kit) {
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
export function choiceForm(
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
export function supportsRichForm(extra: McpExtra) {
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
export async function chooseKitProductHandler(
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
