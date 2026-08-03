import * as styles from "./chip.css";

type ChipProps = {
  label: string;
  selected?: boolean;
  // Exists but sold out: struck-through and greyed, still clickable
  outOfStock?: boolean;
  // The combination does not exist at all (hole in the variant matrix):
  // faded and non-interactive
  nonExistent?: boolean;
  onSelect?: () => void;
  // Optional swatch image (e.g. one per color); omit for a plain text chip.
  media?: string;
};

/**
 * One option value as a selectable pill. Rendered as a `radio` inside the
 * variant picker's `radiogroup`; the picker owns selection state and passes
 * `selected`/`outOfStock`/`nonExistent` computed from the sparse variant list.
 * An out-of-stock chip stays operable: aria-disabled announces the state to
 * assistive tech without blocking activation. A nonexistent chip is natively
 * disabled: the combination cannot be composed.
 */
export function Chip({
  label,
  selected,
  outOfStock,
  nonExistent,
  onSelect,
  media,
}: ChipProps) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: custom radio; a styled button carries the swatch and availability states a native radio cannot, inside the picker radiogroup.
    <button
      type="button"
      role="radio"
      aria-checked={selected ?? false}
      aria-disabled={outOfStock ?? false}
      disabled={nonExistent ?? false}
      className={styles.chip({ selected, outOfStock, nonExistent })}
      onClick={onSelect}
    >
      {media ? (
        <img className={styles.swatch} src={media} alt="" draggable={false} />
      ) : null}
      {label}
    </button>
  );
}
