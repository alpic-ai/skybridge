import { style } from "@vanilla-extract/css";
import { colors, primitives } from "../design/tokens";

export const picker = style({
  display: "flex",
  flexDirection: "column",
  gap: primitives.space.xs,
});

export const section = style({
  display: "flex",
  flexDirection: "column",
  gap: primitives.space["3xs"],
});

export const label = style({
  color: colors.content.subtle,
});

// Chip row: wraps to the next line when it overflows. @todo: swap for a
// horizontal scroll row with an edge fade (as the carousel track) if you expect
// many values on one axis.
export const values = style({
  display: "flex",
  flexWrap: "wrap",
  gap: primitives.space["3xs"],
});
