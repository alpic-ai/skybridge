/**
 * Zero-dep class-name joiner. vanilla-extract's `recipe`/`style` return plain
 * strings, so merging a recipe class with an optional consumer `className`
 * just needs string concatenation that tolerates `undefined`/`false`/`null`.
 *
 *   className={cx(text({ style: "bodyM" }), sprinkles({ color: "accent" }))}
 */
export const cx = (...classes: (string | false | null | undefined)[]) =>
  classes.filter(Boolean).join(" ");
