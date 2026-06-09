import bali from "./assets/trips/bali.webp";
// `?no-inline` keeps the SVG a same-origin file (CSP-safe) instead of an inlined data: URI.
import earth from "./assets/trips/earth.svg?no-inline";
import lisbon from "./assets/trips/lisbon.webp";
import paris from "./assets/trips/paris.webp";
import patagonia from "./assets/trips/patagonia.webp";
import tokyo from "./assets/trips/tokyo.webp";
import { DEFAULT_COVER } from "./constants.js";

// Bundled cover images, keyed by the slug stored in `cover_url` (seed data and the
// create_trip fallback). Vite rewrites these imports to absolute, host-safe asset URLs.
const LOCAL_COVERS: Record<string, string> = {
  bali,
  lisbon,
  paris,
  patagonia,
  tokyo,
  [DEFAULT_COVER]: earth,
};

// Resolve a `cover_url` to a bundled asset when it matches a demo slug,
// otherwise treat it as a regular URL (user-created trips).
export function resolveCover(coverUrl: string): string {
  return LOCAL_COVERS[coverUrl] ?? coverUrl;
}
