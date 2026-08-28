/**
 * View scanning internals, published only so `@skybridge/vite-plugin` can
 * reach them across the package boundary. Not part of the supported API.
 *
 * @module
 * @internal
 */
export type { DiscoveredView, InvalidView } from "./scan-views.js";
export {
  assertUniqueViewNames,
  discoverViewsSync,
  scanAndWriteViewsDts,
  scanViewsSync,
  writeViewsDts,
} from "./scan-views.js";
export { hasDefaultExport } from "./validate-view.js";
