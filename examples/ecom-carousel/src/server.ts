import "./lib/load-env.js"; // must run before the tool modules read process.env
import { McpServer } from "skybridge/server";
import { CAROUSEL_RANGE, MIN_SEARCH_ITERATIONS } from "./config.js";
import {
  renderCarouselDefinition,
  renderCarouselHandler,
} from "./tools/render-carousel.js";
import {
  searchProductsDefinition,
  searchProductsHandler,
} from "./tools/search-products.js";

const server = new McpServer(
  {
    name: "skybridge-shop",
    version: "0.0.1",
  },
  {
    instructions: `\
Skybridge is a winter-sports shop: skis, goggles, and cold-weather apparel. Two phases:

SEARCH: Call search-products (at least ${MIN_SEARCH_ITERATIONS}) before presenting. \
Vary the keyword or scope with a category (apparel, goggles, skis) when the user narrows. \
Stay silent while searching: emit NO text between calls. Speak only \
once the carousel renders.

RENDER: After curating, call render-carousel with the chosen product IDs (aim for ${CAROUSEL_RANGE}). \
Speak only once it renders, then recommend in carousel order.`,
  },
)
  .registerTool(searchProductsDefinition, searchProductsHandler)
  .registerTool(renderCarouselDefinition, renderCarouselHandler);

export default await server.run();

export type AppType = typeof server;
