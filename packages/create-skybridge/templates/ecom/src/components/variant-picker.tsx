import { text } from "../design/tokens";
import { cx } from "../lib/cx";
import { applyChoice, axisStates, type Selection } from "../lib/variants.js";
import type { Product } from "../tools/render-carousel.js";
import { Chip } from "./chip";
import * as styles from "./variant-picker.css";

type VariantPickerProps = {
  product: Product;
  selection: Selection;
  onChange: (selection: Selection) => void;
};

/**
 * Renders one section per option axis. Chip states come from axisStates
 * (lib/variants.ts, top-down): nonexistent values are hard-disabled, sold-out
 * ones struck but clickable (the CTA names the cause), and an axis that does
 * not apply hides its row. A pick goes through applyChoice, which keeps
 * still-existing later choices and snaps the rest onto a real variant.
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
  return (
    <div className={styles.picker}>
      {product.options.map((option) => {
        // Empty map: the axis does not apply to the current configuration.
        const states = axisStates(product, option.id, selection);
        if (states.size === 0) {
          return null;
        }
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
                  nonExistent={!states.has(value.id)}
                  outOfStock={states.get(value.id) === "soldOut"}
                  onSelect={() =>
                    onChange(
                      applyChoice(product, selection, option.id, value.id),
                    )
                  }
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
