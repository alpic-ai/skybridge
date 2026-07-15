import { existsSync } from "node:fs";
import { McpServer } from "skybridge/server";
import { MIN_SEARCH_ITERATIONS } from "./config.js";
import {
  searchProductsDefinition,
  searchProductsHandler,
} from "./tools/search-products.js";

// Load .env into process.env when present (native to Node, no dependency).
if (existsSync(".env")) {
  process.loadEnvFile();
}

const server = new McpServer(
  {
    // @todo: name and version your app.
    name: "skybridge-ecom",
    version: "0.0.1",
  },
  {
    // @todo: adapt this server-wide prompt to your catalog.
    instructions: `\
Two phases:

SEARCH: Call search-products ${MIN_SEARCH_ITERATIONS}+ times before presenting—never off one call. \
Vary the keyword, apply filters from a prior response, or page deeper. \
Stay silent while searching: emit NO text between calls. Speak only \
once the carousel renders. Never call a category unavailable before searching.

RENDER: not implemented yet`,
  },
).registerTool(searchProductsDefinition, searchProductsHandler);

export default await server.run();

export type AppType = typeof server;
