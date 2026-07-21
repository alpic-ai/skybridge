import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { colors, primitives } from "../design/tokens";

// @todo: collapsed height before "read more" appears. Tune to your type scale.
const COLLAPSED_MAX_HEIGHT = "6em";

export const container = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: primitives.space["4xs"],
});

// `clamp` caps the height (applied whenever collapsed, so overflow can be
// measured); `fade` masks the last line to a soft cutoff instead of an ellipsis
// and is applied only when the text actually overflows (never on short copy).
export const body = recipe({
  base: {
    color: colors.content.intense,
    whiteSpace: "pre-line", // preserve paragraph breaks from the source
  },
  variants: {
    clamp: {
      true: { maxHeight: COLLAPSED_MAX_HEIGHT, overflow: "hidden" },
      false: {},
    },
    fade: {
      true: {
        maskImage:
          "linear-gradient(to bottom, black 0%, black 55%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, black 0%, black 55%, transparent 100%)",
      },
      false: {},
    },
  },
  defaultVariants: { clamp: false, fade: false },
});

export const toggle = style({
  padding: 0,
  border: "none",
  background: "none",
  color: colors.common.accent,
  fontFamily: primitives.font.family.primary,
  fontSize: primitives.font.size.s,
  cursor: "pointer",
});
