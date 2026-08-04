// App-wide tuning knobs, shared by the server prompt and the tools.

// Tiny 3-product catalog: one good search is enough, don't force busywork.
// ponytail: bump if the catalog grows.
export const MIN_SEARCH_ITERATIONS = 1;

// Whole catalog is 3 products, so the carousel never shows more.
export const CAROUSEL_MAX_SIZE = 3;

// A "min-max" string (e.g. "3-6") derived from CAROUSEL_MAX_SIZE, interpolated
// into the prompts to tell the model how many products to curate toward.
export const CAROUSEL_RANGE = `${Math.ceil(CAROUSEL_MAX_SIZE / 2)}-${CAROUSEL_MAX_SIZE}`;
