import { recipe } from "@vanilla-extract/recipes";
import { primitives } from "../primitives.css";

/**
 * The one text style, driven by variants. Call it as:
 *   text({ style: "headingM", weight: "medium" })
 *
 * `style` picks the size/line-height pair; `weight` picks the font weight.
 * This is the workhorse recipe: use it for all typography rather than setting
 * fontSize/fontWeight by hand. Headings carry Alpic's tight negative tracking.
 */
export const text = recipe({
  base: {
    fontFamily: primitives.font.family.primary,
    letterSpacing: primitives.font.letterSpacing.default,
    fontWeight: primitives.font.weight.regular,
    margin: 0,
  },
  variants: {
    style: {
      display: {
        fontSize: primitives.font.size["3xl"],
        lineHeight: primitives.font.lineHeight.tight,
        letterSpacing: primitives.font.letterSpacing.tight,
      },
      headingL: {
        fontSize: primitives.font.size["2xl"],
        lineHeight: primitives.font.lineHeight.tight,
        letterSpacing: primitives.font.letterSpacing.tight,
      },
      headingM: {
        fontSize: primitives.font.size.xl,
        lineHeight: primitives.font.lineHeight.tight,
        letterSpacing: primitives.font.letterSpacing.tight,
      },
      headingS: {
        fontSize: primitives.font.size.l,
        lineHeight: primitives.font.lineHeight.tight,
        letterSpacing: primitives.font.letterSpacing.tight,
      },
      bodyM: {
        fontSize: primitives.font.size.m,
        lineHeight: primitives.font.lineHeight.normal,
      },
      bodyS: {
        fontSize: primitives.font.size.s,
        lineHeight: primitives.font.lineHeight.normal,
      },
      labelM: {
        fontSize: primitives.font.size.m,
        lineHeight: primitives.font.lineHeight.tight,
      },
      labelS: {
        fontSize: primitives.font.size.s,
        lineHeight: primitives.font.lineHeight.tight,
      },
      overline: {
        fontSize: primitives.font.size.xs,
        lineHeight: primitives.font.lineHeight.normal,
        letterSpacing: primitives.font.letterSpacing.wide,
        textTransform: "uppercase",
      },
    },
    weight: {
      regular: { fontWeight: primitives.font.weight.regular },
      medium: { fontWeight: primitives.font.weight.medium },
      semibold: { fontWeight: primitives.font.weight.semibold },
      bold: { fontWeight: primitives.font.weight.bold },
    },
  },
  defaultVariants: {
    style: "bodyM",
    weight: "regular",
  },
});
