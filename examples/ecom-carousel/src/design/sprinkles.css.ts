import { createSprinkles, defineProperties } from "@vanilla-extract/sprinkles";
import { colors } from "./contract.css";
import { primitives } from "./primitives.css";

/**
 * Atomic style props built on the primitives + color contract. Use sprinkles
 * for one-off layout/spacing/color on an element, e.g.
 *   sprinkles({ display: "flex", gap: "s", color: "intense" })
 *
 * Structural component styling belongs in a co-located `.css.ts` `style()`
 * block; sprinkles is the thin glue layer on top.
 */

const spaceProperties = defineProperties({
  properties: {
    padding: primitives.space,
    paddingTop: primitives.space,
    paddingRight: primitives.space,
    paddingBottom: primitives.space,
    paddingLeft: primitives.space,
    margin: primitives.space,
    marginTop: primitives.space,
    marginRight: primitives.space,
    marginBottom: primitives.space,
    marginLeft: primitives.space,
    gap: primitives.space,
    rowGap: primitives.space,
    columnGap: primitives.space,
  },
  shorthands: {
    p: ["padding"],
    pt: ["paddingTop"],
    pr: ["paddingRight"],
    pb: ["paddingBottom"],
    pl: ["paddingLeft"],
    px: ["paddingLeft", "paddingRight"],
    py: ["paddingTop", "paddingBottom"],
    m: ["margin"],
    mt: ["marginTop"],
    mr: ["marginRight"],
    mb: ["marginBottom"],
    ml: ["marginLeft"],
    mx: ["marginLeft", "marginRight"],
    my: ["marginTop", "marginBottom"],
  },
});

const colorProperties = defineProperties({
  properties: {
    backgroundColor: {
      ...colors.surface,
      accent: colors.common.accent,
      invertAccent: colors.common.invertAccent,
      highlight: colors.common.highlight,
      transparent: "transparent",
    },
    color: {
      ...colors.content,
      accent: colors.common.accent,
      invertAccent: colors.common.invertAccent,
      highlight: colors.common.highlight,
      error: colors.common.error,
      success: colors.common.success,
    },
    borderColor: {
      ...colors.border,
      accent: colors.common.accent,
      invertAccent: colors.common.invertAccent,
      highlight: colors.common.highlight,
      transparent: "transparent",
    },
  },
});

const radiusProperties = defineProperties({
  properties: {
    borderRadius: primitives.radius,
    borderTopLeftRadius: primitives.radius,
    borderTopRightRadius: primitives.radius,
    borderBottomLeftRadius: primitives.radius,
    borderBottomRightRadius: primitives.radius,
  },
});

const typographyProperties = defineProperties({
  properties: {
    fontFamily: primitives.font.family,
    fontWeight: primitives.font.weight,
    fontSize: primitives.font.size,
    lineHeight: primitives.font.lineHeight,
    letterSpacing: primitives.font.letterSpacing,
  },
});

const strokeProperties = defineProperties({
  properties: {
    borderWidth: primitives.stroke,
  },
});

const layoutProperties = defineProperties({
  properties: {
    display: ["none", "flex", "inline-flex", "block", "inline-block", "grid"],
    flexDirection: ["row", "column", "row-reverse", "column-reverse"],
    alignItems: ["flex-start", "center", "flex-end", "stretch", "baseline"],
    justifyContent: [
      "flex-start",
      "center",
      "flex-end",
      "space-between",
      "space-around",
      "space-evenly",
    ],
    flexWrap: ["wrap", "nowrap", "wrap-reverse"],
    textAlign: ["left", "center", "right"],
  },
});

export const sprinkles = createSprinkles(
  spaceProperties,
  colorProperties,
  radiusProperties,
  typographyProperties,
  strokeProperties,
  layoutProperties,
);

export type Sprinkles = Parameters<typeof sprinkles>[0];
