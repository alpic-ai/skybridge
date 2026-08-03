import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { colors, primitives } from "../design/tokens";

// A selectable pill used for option values (sizes, colors…). `selected`,
// `outOfStock` and `nonExistent` are driven by the variant picker from the
// sparse variant list. Selected = magenta accent border (Alpic).
export const chip = recipe({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: primitives.space["4xs"],
    minHeight: "44px", // touch target
    padding: `${primitives.space["4xs"]} ${primitives.space["3xs"]}`,
    borderRadius: primitives.radius.m,
    border: `${primitives.stroke.thin} solid ${colors.border.subtle}`,
    backgroundColor: colors.surface.extraLight,
    color: colors.content.intense,
    fontFamily: primitives.font.family.primary,
    fontSize: primitives.font.size.s,
    cursor: "pointer",
    transition: "border-color 150ms ease",
    "@media": {
      "(prefers-reduced-motion: reduce)": { transition: "none" },
    },
  },
  variants: {
    selected: {
      true: {
        borderColor: colors.common.accent,
        borderWidth: primitives.stroke.medium,
      },
      false: {},
    },
    outOfStock: {
      // Struck but still clickable; the buy CTA carries the state.
      true: {
        color: colors.content.subtle,
        textDecoration: "line-through",
      },
      false: {},
    },
    nonExistent: {
      // Faded and non-interactive, distinct from sold out above.
      true: {
        opacity: 0.35,
        cursor: "default",
      },
      false: {},
    },
  },
  defaultVariants: { selected: false, outOfStock: false, nonExistent: false },
});

// Small color/material swatch shown before the label on image chips.
export const swatch = style({
  width: "20px",
  height: "20px",
  borderRadius: primitives.radius.full,
  objectFit: "cover",
  display: "block",
});
