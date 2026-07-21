import { text } from "../design/tokens";
import { cx } from "../lib/cx";
import { type Selection, selectableValues } from "../lib/variants.js";
import type { Product } from "../tools/render-carousel.js";
import { Chip } from "./chip";
import * as styles from "./variant-picker.css";

type VariantPickerProps = {
  product: Product;
  selection: Selection;
  onChange: (selection: Selection) => void;
};

/**
 * Renders one section per option axis and resolves the client's choices against
 * the product's SPARSE variant list. Values with no surviving variant (given
 * the other choices) are disabled, not hidden. Selecting a value that strands an
 * earlier choice drops that choice so the selection stays reachable.
 *
 * This is the in-place model: every axis is local state, no remount. @todo: if
 * a catalog models an axis (e.g. color) as separate products, promote it to a
 * cross-product switch that changes the opened product id instead.
 */
export function VariantPicker({
  product,
  selection,
  onChange,
}: VariantPickerProps) {
  function choose(axisId: string, valueId: string) {
    const next: Selection = { ...selection, [axisId]: valueId };
    // Repair: drop any other-axis choice the new pick just made unreachable.
    for (const option of product.options) {
      if (option.id === axisId) {
        continue;
      }
      const chosen = next[option.id];
      if (
        chosen != null &&
        !selectableValues(product, option.id, next).has(chosen)
      ) {
        delete next[option.id];
      }
    }
    onChange(next);
  }

  return (
    <div className={styles.picker}>
      {product.options.map((option) => {
        // A single-value axis is not a choice; skip it.
        if (option.values.length <= 1) {
          return null;
        }
        const reachable = selectableValues(product, option.id, selection);
        return (
          <div
            key={option.id}
            className={styles.section}
            role="radiogroup"
            aria-label={option.label}
          >
            <span className={cx(text({ style: "labelS" }), styles.label)}>
              {option.label}
            </span>
            <div className={styles.values}>
              {option.values.map((value) => (
                <Chip
                  key={value.id}
                  label={value.label}
                  media={value.media}
                  selected={selection[option.id] === value.id}
                  disabled={!reachable.has(value.id)}
                  onSelect={() => choose(option.id, value.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
