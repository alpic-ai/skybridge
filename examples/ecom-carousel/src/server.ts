import "./lib/load-env.js"; // must run before tool modules read process.env
import { Skybridge } from "skybridge/server";
import {
  mentionsConfig,
  registerProductResources,
  registerRichFormAdapter,
  settingsCapability,
  settingsReadDefinition,
  settingsReadHandler,
  settingsUpdateDefinition,
  settingsUpdateHandler,
  shopDefinition,
  shopHandler,
  shopIcons,
} from "./tools/extensions.js";

export const app = new Skybridge({
  name: "skybridge-shop",
  title: "Skybridge Shop",
  icons: shopIcons,
  version: "0.0.1",
  supportedProtocolVersions: ["2026-07-28", "2025-11-25"],
  capabilities: {
    extensions: { "openai/settings": settingsCapability },
    experimental: { "openai/settings": settingsCapability },
  },
  instructions: `Skybridge is a winter-sports shop: skis, goggles, and cold-weather apparel.
Use shop with action search and a short keyword/category to find and visibly present products in one call. Ground recommendations in returned catalogue facts and displayed order. Use action carousel with curated product ids to refine the displayed selection. Use browse to open the workspace or a specific product, kit to open My Kit, and choose with product ids for a native illustrated choice. Exact variants and quantities are selected in the UI; the kit is local demo state. Purchases use the external storefront. Never invent product details, price, stock, or a completed purchase.`,
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

export type AppType = typeof app;
