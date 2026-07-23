import type { Price } from "../types.js";

// Pass useUser().locale from the view; omit for the runtime default.
export function formatPrice(price: Price, locale?: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: price.currency,
  }).format(price.amount);
}
