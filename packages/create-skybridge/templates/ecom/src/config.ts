// App-wide tuning knobs, shared by the server prompt and the tools.

// @todo: minimum number of searches the model runs before rendering. Feeds the
// prompts to enforce multi-call exploration; raise for deeper results.
export const MIN_SEARCH_ITERATIONS = 2;

// @todo: how many products the carousel curates toward. CAROUSEL_RANGE is
// interpolated into the prompts so the model aims for the right amount.
export const CAROUSEL_MAX_SIZE = 6;
export const CAROUSEL_RANGE = `${Math.ceil(CAROUSEL_MAX_SIZE / 2)}-${CAROUSEL_MAX_SIZE}`;
