import { existsSync } from "node:fs";
import { Skybridge } from "skybridge/server";
import { CAROUSEL_RANGE, MIN_SEARCH_ITERATIONS } from "./config.js";
import {
  renderCarouselDefinition,
  renderCarouselHandler,
} from "./tools/render-carousel.js";
import {
  searchProductsDefinition,
  searchProductsHandler,
} from "./tools/search-products.js";

// Load .env into process.env when present (native to Node, no dependency).
if (existsSync(".env")) {
  process.loadEnvFile();
}

export const app = new Skybridge({
  // @todo: name and version your app.
  name: "skybridge-ecom",
  version: "0.0.1",
  // @todo: adapt this server-wide prompt to your catalog.
  instructions: `\
Two phases:

SEARCH: Call search-products ${MIN_SEARCH_ITERATIONS}+ times before presenting, never off one call. \
Vary the keywords or page deeper. \
Stay silent while searching: emit NO text between calls. Speak only \
once the carousel renders.

RENDER: After curating, call render-carousel with the chosen product IDs (aim for ${CAROUSEL_RANGE}). \
Speak once it renders, then recommend products in carousel order.`,
  handler: (server) =>
    server
      .registerTool(searchProductsDefinition, searchProductsHandler)
      .registerTool(renderCarouselDefinition, renderCarouselHandler),
});

export type AppType = typeof app;
