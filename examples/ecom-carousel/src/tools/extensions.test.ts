import assert from "node:assert/strict";
import { test } from "node:test";
import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { type McpExtra, Skybridge } from "skybridge/server";
import { z } from "zod";
import {
  readPreferences,
  scopes,
  updatePreferences,
} from "../lib/preferences.js";
import {
  choiceForm,
  chooseKitProductHandler,
  mentionsConfig,
  registerProductResources,
  registerRichFormAdapter,
  settingsCapability,
  settingsReadDefinition,
  settingsReadHandler,
  settingsSetSchema,
  settingsUpdateDefinition,
  settingsUpdateHandler,
  shopDefinition,
  shopHandler,
  shopInputSchema,
} from "./extensions.js";

const extra = (meta: Record<string, string> = {}) =>
  ({ mcpReq: { _meta: meta } }) as McpExtra;
test("settings isolate users, preserve omitted values, and reject unscoped updates", () => {
  const a = scopes(extra({ "openai/subject": "alice", "openai/session": "a" }));
  const b = scopes(extra({ "openai/subject": "bob", "openai/session": "a" }));
  updatePreferences(a.preferences, { size: "M", color: "Blue" });
  assert.deepEqual(updatePreferences(a.preferences, { color: "Black" }), {
    size: "M",
    color: "Black",
  });
  assert.deepEqual(readPreferences(b.preferences), { size: "", color: "" });
  assert.notEqual(a.kit, b.kit);
  assert.equal(scopes(extra()).kit, null);
  assert.throws(() => updatePreferences(null, { size: "S" }));
  assert.equal(settingsSetSchema.safeParse({}).success, false);
  assert.equal(
    settingsSetSchema.safeParse({ unknown: "value" }).success,
    false,
  );
  assert.equal(
    settingsSetSchema.safeParse({ size: "invented" }).success,
    false,
  );
});
test("entrypoints accept empty input and use canonical metadata", () => {
  assert.deepEqual(shopInputSchema.parse({}), { action: "browse" });
  assert.deepEqual(shopDefinition.openai.entrypoints, [
    { type: "global" },
    { type: "thread" },
  ]);
});

test("real v2 registration resolves mentions and completes the OpenAI MRTR form round trip", async () => {
  const originalFetch = globalThis.fetch;
  process.env.MEDUSA_BASE_URL = "https://catalog.test";
  process.env.MEDUSA_PUBLISHABLE_KEY = "test-public-key";
  const raw = {
    id: "prod_test",
    title: "Test jacket",
    description: "A test jacket",
    handle: "jacket",
    thumbnail: "https://catalog.test/jacket.png",
    categories: [{ name: "apparel" }],
    options: [],
    variants: [
      {
        id: "variant_test",
        options: [],
        calculated_price: { calculated_amount: 99, currency_code: "eur" },
      },
    ],
  };
  const thumbnailBytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLttAAAAABJRU5ErkJggg==",
    "base64",
  );
  globalThis.fetch = async (url) => {
    if (String(url) === raw.thumbnail) {
      return new Response(thumbnailBytes, {
        headers: { "content-type": "image/png" },
      });
    }
    return new Response(
      JSON.stringify(
        String(url).includes("/regions")
          ? { regions: [{ id: "region" }] }
          : { products: [raw], count: 1 },
      ),
      { headers: { "content-type": "application/json" } },
    );
  };
  const app = new Skybridge({
    name: "extensions-test",
    version: "1",
    supportedProtocolVersions: ["2026-07-28", "2025-11-25"],
    capabilities: { extensions: { "openai/settings": settingsCapability } },
    handler: (server) => {
      registerProductResources(server);
      registerRichFormAdapter(server);
      return server
        .registerTool(shopDefinition, shopHandler)
        .registerTool(settingsReadDefinition, settingsReadHandler)
        .registerTool(settingsUpdateDefinition, settingsUpdateHandler)
        .registerMentions(mentionsConfig);
    },
  });
  const httpHandler = createMcpHandler(() => app.createServerInstance());
  const client = new Client(
    { name: "test-host", version: "1" },
    {
      supportedProtocolVersions: ["2026-07-28"],
      versionNegotiation: { mode: { pin: "2026-07-28" } },
      capabilities: { extensions: { "openai/elicitation": { form: {} } } },
    },
  );
  const clientTransport = new StreamableHTTPClientTransport(
    new URL("https://mcp.test/mcp"),
    { fetch: (url, init) => httpHandler.fetch(new Request(url, init)) },
  );
  try {
    await client.connect(clientTransport);
    const listed = await client.listTools();
    assert.deepEqual(listed.tools.map((tool) => tool.name).sort(), [
      "search-mentions",
      "settings-read",
      "settings-update",
      "shop",
    ]);
    assert.equal(
      listed.tools.filter(
        (tool) =>
          !(
            tool._meta?.ui as { visibility?: string[] } | undefined
          )?.visibility?.includes("app"),
      ).length,
      1,
    );
    const browse = listed.tools.find((tool) => tool.name === "shop");
    assert.equal(browse?.title, "Skybridge Shop");
    assert.ok(browse?.icons?.[0]?.src.startsWith("data:image/svg+xml;base64,"));
    assert.deepEqual(browse?._meta?.["openai/ui"], {
      entrypoints: [{ type: "global" }, { type: "thread" }],
    });
    assert.ok(
      listed.tools.find((tool) => tool.name === "search-mentions")?._meta?.[
        "openai/extensions"
      ],
    );
    assert.ok(
      listed.tools.find((tool) => tool.name === "settings-read")?.outputSchema,
    );
    const nativeSettings = await client.callTool({
      name: "settings-read",
      arguments: {},
      _meta: { "openai/subject": "native-settings-user" },
    });
    assert.deepEqual(
      (nativeSettings.structuredContent as { values: unknown }).values,
      { size: "", color: "" },
    );
    const updatedSettings = await client.callTool({
      name: "settings-update",
      arguments: { set: { size: "L" } },
      _meta: { "openai/subject": "native-settings-user" },
    });
    assert.deepEqual(
      (updatedSettings.structuredContent as { values: unknown }).values,
      { size: "L", color: "" },
    );
    const mentions = await client.callTool({
      name: "search-mentions",
      arguments: { query: "jacket" },
    });
    assert.equal(
      (mentions.structuredContent as { items: { uri: string }[] }).items[0]
        ?.uri,
      "product://catalog/prod_test",
    );
    const resource = await client.readResource({
      uri: "product://catalog/prod_test",
    });
    assert.ok(
      "text" in resource.contents[0] &&
        resource.contents[0].text.includes("variant_test"),
    );
    const visibleSearch = await client.callTool({
      name: "shop",
      arguments: { action: "search", keyword: "jacket" },
    });
    assert.equal(
      (visibleSearch._meta as { presentation: string }).presentation,
      "carousel",
    );
    assert.equal(
      (visibleSearch.structuredContent as { products: { id: string }[] })
        .products[0]?.id,
      raw.id,
    );
    const curated = await client.callTool({
      name: "shop",
      arguments: { action: "carousel", ids: [raw.id] },
    });
    assert.equal(
      (curated._meta as { presentation: string }).presentation,
      "carousel",
    );
    const kit = await client.callTool({
      name: "shop",
      arguments: { action: "kit" },
    });
    assert.equal((kit._meta as { presentation: string }).presentation, "kit");
    const missingIds = await client.callTool({
      name: "shop",
      arguments: { action: "choose" },
    });
    assert.equal(missingIds.isError, true);
    const ready = await shopHandler({}, extra({ "openai/session": "test" }));
    assert.equal(ready._meta.products[0]?.variants[0]?.id, "variant_test");
    const schema = choiceForm(ready._meta.products);
    assert.equal(
      schema.requestedSchema.properties.productId.oneOf[0]?.[
        "x-openai-thumbnail"
      ]?.src,
      raw.thumbnail,
    );
    const first = await client.request(
      {
        method: "tools/call",
        params: {
          name: "shop",
          arguments: { action: "choose", ids: [raw.id] },
        },
      },
      z.looseObject({}),
      { allowInputRequired: true },
    );
    assert.equal(first.resultType, "input_required", JSON.stringify(first));
    const inputRequests = first.inputRequests as Record<
      string,
      { method: string; params: typeof schema }
    >;
    assert.equal(
      inputRequests["kit-product"]?.method,
      "openai/elicitation/create",
    );
    assert.equal(
      inputRequests["kit-product"]?.params.requestedSchema.properties.productId
        .oneOf[0]?.["x-openai-thumbnail"]?.src,
      `data:image/png;base64,${thumbnailBytes.toString("base64")}`,
    );
    const retry = await client.request(
      {
        method: "tools/call",
        params: {
          name: "shop",
          arguments: { action: "choose", ids: [raw.id] },
          requestState: first.requestState as string,
          inputResponses: {
            "kit-product": { action: "accept", content: { productId: raw.id } },
          },
        },
      },
      z.looseObject({}),
    );
    assert.equal(
      (retry.structuredContent as { status: string }).status,
      "selected",
    );
    assert.equal(
      (retry.structuredContent as { productId: string }).productId,
      raw.id,
    );
    assert.equal(
      (retry._meta as { selectedProductId: string }).selectedProductId,
      raw.id,
    );
    const invalid = await client.request(
      {
        method: "tools/call",
        params: {
          name: "shop",
          arguments: { action: "choose", ids: [raw.id] },
          requestState: first.requestState as string,
          inputResponses: {
            "kit-product": {
              action: "accept",
              content: { productId: "forged" },
            },
          },
        },
      },
      z.looseObject({}),
    );
    assert.equal(invalid.isError, true);
    const tampered = await client.request(
      {
        method: "tools/call",
        params: {
          name: "shop",
          arguments: { action: "choose", ids: [raw.id] },
          requestState: `${first.requestState}tampered`,
          inputResponses: {
            "kit-product": { action: "accept", content: { productId: raw.id } },
          },
        },
      },
      z.looseObject({}),
    );
    assert.equal(tampered.isError, true);
    const cancelled = await client.request(
      {
        method: "tools/call",
        params: {
          name: "shop",
          arguments: { action: "choose", ids: [raw.id] },
          requestState: first.requestState as string,
          inputResponses: { "kit-product": { action: "cancel" } },
        },
      },
      z.looseObject({}),
    );
    assert.equal(
      (cancelled.structuredContent as { status: string }).status,
      "cancelled",
    );
    assert.equal(
      (cancelled.structuredContent as { productId: string | null }).productId,
      null,
    );
    const fallback = await chooseKitProductHandler({ ids: [raw.id] }, extra());
    assert.equal(fallback.structuredContent?.status, "fallback");
    const plainClient = new Client(
      { name: "plain-host", version: "1" },
      {
        supportedProtocolVersions: ["2026-07-28"],
        versionNegotiation: { mode: { pin: "2026-07-28" } },
      },
    );
    try {
      await plainClient.connect(
        new StreamableHTTPClientTransport(new URL("https://mcp.test/mcp"), {
          fetch: (url, init) => httpHandler.fetch(new Request(url, init)),
        }),
      );
      const plainChoice = await plainClient.callTool({
        name: "shop",
        arguments: { action: "choose", ids: [raw.id] },
      });
      assert.equal(
        (plainChoice.structuredContent as { status: string }).status,
        "fallback",
      );
    } finally {
      await plainClient.close();
    }
  } finally {
    await client.close();
    await httpHandler.close();
    globalThis.fetch = originalFetch;
  }
});
