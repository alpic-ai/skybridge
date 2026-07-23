import type { Product, Variant } from "../tools/render-carousel.js";

// Pure helpers that turn the client's option choices into a concrete variant.
// The `variants` list is SPARSE: only combinations that exist are present, and
// that is the whole contingency model. These helpers never encode rules; they
// filter the list. A variant may also skip an axis entirely (a one-size cap in
// a capacity x size catalog carries no `size`): that axis is simply "not
// applicable" to it, and the helpers treat the absence as its own value.
//
// Availability is computed TOP-DOWN (the Shopify convention): an axis is
// constrained only by the choices on the axes declared BEFORE it. So the first
// axis is never disabled by a later choice, and each later axis narrows under
// the ones above. Order the `options` array accordingly.

// A selection is one chosen value per axis, keyed by Option.id -> OptionValue.id.
export type Selection = Record<string, string>;

/**
 * The variant that exactly matches a selection, or undefined if none does.
 * Strict per-axis equality with "missing" normalized to null: a partial
 * selection resolves nothing, and a variant that skips an axis matches only a
 * selection that also leaves it unset. A product with no options resolves to
 * its single variant on an empty selection.
 */
export function resolveVariant(
  product: Product,
  selection: Selection,
): Variant | undefined {
  return product.variants.find((variant) =>
    product.options.every(
      (option) =>
        (variant.selection[option.id] ?? null) ===
        (selection[option.id] ?? null),
    ),
  );
}

/**
 * The state of every value of `axisId` given the choices on the axes ABOVE it:
 * - "inStock": at least one matching variant is purchasable → normal chip.
 * - "soldOut": matching variants exist, none in stock → struck, clickable.
 * - absent: a hole in the variant matrix → hard-disabled chip.
 * An empty map means the axis does not apply to the current configuration (a
 * one-size colorway has no Size), and the picker hides its row.
 */
export function axisStates(
  product: Product,
  axisId: string,
  selection: Selection,
): Map<string, "inStock" | "soldOut"> {
  const states = new Map<string, "inStock" | "soldOut">();
  for (const variant of product.variants) {
    let matchesEarlier = true;
    for (const option of product.options) {
      if (option.id === axisId) {
        break; // only the axes above constrain this one
      }
      const chosen = selection[option.id];
      const carried = variant.selection[option.id];
      if (chosen != null && carried !== undefined && carried !== chosen) {
        matchesEarlier = false;
        break;
      }
    }
    if (!matchesEarlier) {
      continue;
    }
    // A variant to which this axis does not apply carries no value to offer.
    const value = variant.selection[axisId];
    if (value !== undefined && states.get(value) !== "inStock") {
      states.set(value, variant.outOfStock ? "soldOut" : "inStock");
    }
  }
  return states;
}

/**
 * The selection after picking `valueId` on `axisId`: the one state transition
 * of the picker, rebuilt top-down.
 * - An axis with no reachable value does not apply: its choice is dropped.
 * - A prior choice that still EXISTS under the axes above is KEPT, even sold
 *   out: switching color never silently changes the size the user asked for.
 * - Anything else fills with the first value in display order, preferring one
 *   that is in stock.
 * The result resolves to a concrete variant, with one exception: a variant
 * skipping an EARLIER axis keeps offering its later values under any choice on
 * that axis, so picking one can compose a selection no variant matches. The
 * detail renders that as "Combination unavailable".
 */
export function applyChoice(
  product: Product,
  selection: Selection,
  axisId: string,
  valueId: string,
): Selection {
  const next: Selection = {};
  for (const option of product.options) {
    const candidate = option.id === axisId ? valueId : selection[option.id];
    const states = axisStates(product, option.id, next);
    if (states.size === 0) {
      continue; // axis does not apply to the configuration above it
    }
    if (candidate != null && states.has(candidate)) {
      next[option.id] = candidate;
      continue;
    }
    let fill: string | undefined;
    for (const value of option.values) {
      if (states.get(value.id) === "inStock") {
        fill = value.id;
        break;
      }
    }
    if (fill === undefined) {
      for (const value of option.values) {
        if (states.has(value.id)) {
          fill = value.id;
          break;
        }
      }
    }
    if (fill !== undefined) {
      next[option.id] = fill;
    }
  }
  return next;
}

/**
 * The selection to preselect when a product opens: the variant the client
 * tapped (its id equals the opened product id), else the first IN-STOCK
 * variant, else the first variant. A variant is always preselected when the
 * product has any, so the buy CTA is live on open rather than starting
 * disabled.
 */
export function initialSelection(product: Product): Selection {
  let base: Variant | undefined;
  let firstInStock: Variant | undefined;
  for (const variant of product.variants) {
    if (variant.id === product.id) {
      base = variant;
      break;
    }
    if (firstInStock === undefined && !variant.outOfStock) {
      firstInStock = variant;
    }
  }
  base ??= firstInStock ?? product.variants[0];
  return base ? { ...base.selection } : {};
}
