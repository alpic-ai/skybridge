import * as styles from "./chip.css";

type ChipProps = {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
  // Optional swatch image (e.g. one per color); omit for a plain text chip.
  media?: string;
};

/**
 * One option value as a selectable pill. Rendered as a `radio` inside the
 * variant picker's `radiogroup`; the picker owns selection state and passes
 * `selected`/`disabled` computed from the sparse variant list.
 */
export function Chip({ label, selected, disabled, onSelect, media }: ChipProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected ?? false}
      aria-disabled={disabled ?? false}
      disabled={disabled}
      className={styles.chip({ selected, disabled })}
      onClick={disabled ? undefined : onSelect}
    >
      {media ? (
        <img className={styles.swatch} src={media} alt="" draggable={false} />
      ) : null}
      {label}
    </button>
  );
}
