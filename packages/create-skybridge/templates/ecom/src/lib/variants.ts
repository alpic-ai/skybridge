import type { Product, Variant } from "../tools/render-carousel.js";

// Pure helpers that turn the client's option choices into a concrete variant.
// The `variants` list is SPARSE: only combinations that exist are present, and
// that is the whole contingency model. These helpers never encode rules; they
// filter the list.

// A selection is one chosen value per axis, keyed by Option.id -> OptionValue.id.
export type Selection = Record<string, string>;

/**
 * The variant matching a full selection (one value per axis), or undefined if
 * the selection is partial or the combination does not exist. A product with no
 * options resolves to its single variant on an empty selection.
 */
export function resolveVariant(
  product: Product,
  selection: Selection,
): Variant | undefined {
  for (const option of product.options) {
    if (selection[option.id] == null) {
      return undefined; // partial selection: nothing resolved yet
    }
  }
  return product.variants.find((variant) =>
    product.options.every(
      (option) => variant.selection[option.id] === selection[option.id],
    ),
  );
}

/**
 * The values of `axisId` still reachable given the choices already made on the
 * OTHER axes. A value is reachable if at least one variant carries it while
 * matching every other current choice. Values not in this set have no surviving
 * variant, so the picker disables them ("Red only in M").
 */
export function selectableValues(
  product: Product,
  axisId: string,
  selection: Selection,
): Set<string> {
  const reachable = new Set<string>();
  for (const variant of product.variants) {
    let matchesOthers = true;
    for (const option of product.options) {
      if (option.id === axisId) {
        continue;
      }
      const chosen = selection[option.id];
      if (chosen != null && variant.selection[option.id] !== chosen) {
        matchesOthers = false;
        break;
      }
    }
    if (matchesOthers) {
      reachable.add(variant.selection[axisId]);
    }
  }
  return reachable;
}

/**
 * The selection to preselect when a product opens: the variant the client
 * tapped (its id equals the opened product id), else the first variant. A
 * variant is always preselected when the product has any, so the buy CTA is
 * live on open rather than starting disabled.
 */
export function initialSelection(product: Product): Selection {
  let base: Variant | undefined;
  for (const variant of product.variants) {
    if (variant.id === product.id) {
      base = variant;
      break;
    }
  }
  base ??= product.variants[0];
  return base ? { ...base.selection } : {};
}
