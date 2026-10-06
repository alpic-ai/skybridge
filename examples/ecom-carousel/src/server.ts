import "./lib/load-env.js"; // must run before tool modules read process.env
import { Skybridge } from "skybridge/server";
import {
  mentionsConfig,
  registerProductResources,
} from "./tools/search-mentions.js";
import {
  settingsReadDefinition,
  settingsReadHandler,
} from "./tools/settings-read.js";
import {
  settingsUpdateDefinition,
  settingsUpdateHandler,
} from "./tools/settings-update.js";
import {
  registerRichFormAdapter,
  shopDefinition,
  shopHandler,
  shopIcons,
} from "./tools/shop.js";

const settingsCapability = {
  readTool: "settings-read",
  updateTool: "settings-update",
};

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
Use shop with action search and a short keyword/category to find and visibly present products in one call. Ground recommendations in returned catalogue facts and displayed order. Use action carousel with curated product ids to refine the displayed selection. Use browse to open the workspace or a specific product, and choose with product ids for a native illustrated choice. My Kit is a tab in the workspace and lasts only while that view is open. Exact variants and quantities are selected in the UI. Purchases use the external storefront. Never invent product details, price, stock, or a completed purchase.`,
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
