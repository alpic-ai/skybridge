import { style } from "@vanilla-extract/css";
import { colors, primitives } from "../../../design/tokens";

// Two-column breakpoint. Layout is driven by the pane's own width (container
// query), never the viewport, so a phone and a resized desktop pane agree.
const TWO_COLUMN_MIN_WIDTH = "560px";

export const detail = style({
  containerType: "inline-size",
  padding: primitives.space.s,
  // Clear the notch / home indicator when the page bleeds to the screen edge.
  paddingBottom: `calc(${primitives.space.s} + env(safe-area-inset-bottom))`,
});

// Product / variant id, idiomatically top-right. @todo: reposition (drop the
// right align, or move it in the JSX) or remove it.
export const reference = style({
  textAlign: "right",
  color: colors.content.subtle,
  marginBottom: primitives.space["3xs"],
});

// Single column by default; two columns (gallery | info) once the pane is wide.
export const grid = style({
  display: "flex",
  flexDirection: "column",
  gap: primitives.space.s,
  maxWidth: "1099px",
  marginInline: "auto",
  "@container": {
    [`(min-width: ${TWO_COLUMN_MIN_WIDTH})`]: {
      display: "grid",
      // `minmax(0, 1fr)` (not `1fr`) lets a column shrink below its content's
      // intrinsic width, so a chip row scrolls/wraps instead of blowing out.
      gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
      gridTemplateAreas: '"gallery info"',
      alignItems: "start",
    },
  },
});

export const galleryCell = style({
  "@container": {
    [`(min-width: ${TWO_COLUMN_MIN_WIDTH})`]: {
      gridArea: "gallery",
      position: "sticky",
      top: primitives.space.s,
    },
  },
});

// The info column owns all inter-section spacing; sections set no outer margin.
export const info = style({
  display: "flex",
  flexDirection: "column",
  gap: primitives.space.xs,
  "@container": {
    [`(min-width: ${TWO_COLUMN_MIN_WIDTH})`]: { gridArea: "info" },
  },
});

export const title = style({ color: colors.content.intense });

export const price = style({ color: colors.content.intense });

export const oos = style({ color: colors.common.error });

// Product facts as a simple list: one line per fact, "label: value" (or just
// the value when unlabeled). marginTop separates it from the section heading.
// @todo: reshape freely (a table, grouped sections, inline chips…)
export const specList = style({
  display: "flex",
  flexDirection: "column",
  gap: primitives.space["3xs"],
  marginTop: primitives.space["3xs"],
  marginBottom: 0,
});

// One fact on a line: "label:" then value.
export const specRow = style({
  display: "flex",
  gap: primitives.space["4xs"],
});

export const specLabel = style({
  margin: 0,
  color: colors.content.subtle,
});

export const specValue = style({
  margin: 0,
  color: colors.content.intense,
});

// Primary CTA. @todo: tune to your brand; add a secondary action beside it
// (ask-the-assistant, contact) as a per-catalog extension.
export const cta = style({
  minHeight: "44px",
  padding: `${primitives.space["3xs"]} ${primitives.space.s}`,
  borderRadius: primitives.radius.m,
  border: "none",
  backgroundColor: colors.common.accent,
  color: colors.content.invertIntense,
  fontFamily: primitives.font.family.primary,
  fontSize: primitives.font.size.m,
  fontWeight: primitives.font.weight.medium,
  cursor: "pointer",
  selectors: {
    "&:disabled": {
      backgroundColor: colors.surface.intense,
      color: colors.content.subtle,
      cursor: "not-allowed",
    },
  },
});
