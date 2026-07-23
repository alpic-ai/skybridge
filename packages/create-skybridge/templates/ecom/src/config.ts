// App-wide tuning knobs, shared by the server prompt and the tools.

// @todo: minimum number of searches the model runs before rendering. Feeds the
// prompts to enforce multi-call exploration; raise for deeper results.
export const MIN_SEARCH_ITERATIONS = 2;

// @todo: the maximum number of products the carousel shows.
export const CAROUSEL_MAX_SIZE = 6;

// A "min-max" string (e.g. "3-6") derived from CAROUSEL_MAX_SIZE, interpolated
// into the prompts to tell the model how many products to curate toward.
export const CAROUSEL_RANGE = `${Math.ceil(CAROUSEL_MAX_SIZE / 2)}-${CAROUSEL_MAX_SIZE}`;
