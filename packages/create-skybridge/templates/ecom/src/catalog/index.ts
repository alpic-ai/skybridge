// The catalog: the app's single data seam. Both tools read products through
// these two functions, and nothing else in the app touches a backend.
//
// @todo: pick your provider. Ship one of the modules next to this file, or add
// your own (same two exports, same types) and re-export it here:
//   ./mock.js      placeholder catalog, no backend needed (default)
//   ./shopify.js   Shopify Storefront API, set the SHOPIFY_* vars in .env
//
// Writing your own: `search(input)` returns a `SearchResult`, `getProducts(ids)`
// resolves ids in the requested order (that is the display order, so resolve by
// id, never by catalog order). Both map your backend's rows into `Product`s, and
// how you group them depends on your catalog:
//   - simple products: one `Product` with a single variant, `options: []`
//   - grouped: one `Product` per product, `card` = union of its variants
//   - one card per variant: `card` = that variant
// Either way `variants` holds ALL variants the source returns for the product;
// the detail view reads them so the client can switch variant. Order `options`
// with the imagery-driving axis first (see `Product`: order is semantic).
export { getProducts, search } from "./mock.js";
