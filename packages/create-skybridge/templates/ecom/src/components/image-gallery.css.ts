import { globalStyle, style } from "@vanilla-extract/css";
import { colors, primitives } from "../design/tokens";

export const gallery = style({
  position: "relative",
});

// Rail mode only (THUMBNAIL_RAIL): lay the rail beside the image on desktop. The
// breakpoint matches the PDP's two-column grid and resolves against the same
// `.detail` container, so the rail appears exactly when the page goes two-column.
export const galleryRail = style({
  "@container": {
    "(min-width: 560px)": {
      display: "flex",
      flexDirection: "row",
      gap: primitives.space["2xs"],
      // Top-align so the rail sits beside the image; the rail's own max-height
      // (set from the measured image height) caps it and scrolls the excess.
      alignItems: "flex-start",
    },
  },
});

// Image column: the positioning context for the overlaid chevrons, and the flex
// child that takes the width left of the rail on desktop.
export const mainCol = style({
  position: "relative",
  minWidth: 0,
  "@container": {
    "(min-width: 560px)": { flex: 1 },
  },
});

// Scroll-snap track: one image per view. Native swipe on touch; the chevrons
// are the pointer affordance. Scrollbar hidden.
export const track = style({
  display: "flex",
  overflowX: "auto",
  scrollSnapType: "x mandatory",
  scrollBehavior: "smooth",
  scrollbarWidth: "none",
  borderRadius: primitives.radius.m,
  "@media": {
    "(prefers-reduced-motion: reduce)": { scrollBehavior: "auto" },
  },
});

globalStyle(`${track}::-webkit-scrollbar`, { display: "none" });

export const slide = style({
  flex: "0 0 100%",
  scrollSnapAlign: "start",
  // Reserve a square box so images load without shifting the page. @todo: match
  // the carousel card's aspect ratio / fit if you changed them there.
  aspectRatio: "1",
  backgroundColor: colors.surface.subtle,
});

export const image = style({
  width: "100%",
  height: "100%",
  objectFit: "contain",
  display: "block",
  pointerEvents: "none",
  userSelect: "none",
});

// Prev/next chevrons, vertically centered, disabled at the ends.
export const nav = style({
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  display: "grid",
  placeItems: "center",
  width: "36px",
  height: "36px",
  padding: 0,
  borderRadius: primitives.radius.full,
  border: `${primitives.stroke.thin} solid ${colors.border.subtle}`,
  backgroundColor: colors.surface.extraLight,
  color: colors.content.intense,
  cursor: "pointer",
  transition: "opacity 150ms ease",
  selectors: {
    "&:disabled": { opacity: 0, pointerEvents: "none" },
  },
});

export const navPrev = style({ left: primitives.space["3xs"] });
export const navNext = style({ right: primitives.space["3xs"] });

// Position indicator: a thin track with a fill sized to (index + 1) / count.
// @todo: style to your brand — height, track/fill colors, radius, width, and placement.
export const progress = style({
  height: "3px",
  marginTop: primitives.space["3xs"],
  borderRadius: primitives.radius.full,
  backgroundColor: colors.border.thin,
  overflow: "hidden",
});

export const progressFill = style({
  height: "100%",
  borderRadius: primitives.radius.full,
  backgroundColor: colors.content.intense,
  transition: "width 200ms ease",
  "@media": {
    "(prefers-reduced-motion: reduce)": { transition: "none" },
  },
});

// In rail mode the rail conveys position on desktop, so the progress bar is
// mobile-only there.
export const progressMobileOnly = style({
  "@container": {
    "(min-width: 560px)": { display: "none" },
  },
});

// Desktop thumbnail rail (THUMBNAIL_RAIL). Hidden on mobile, where the swipe
// track + progress bar own navigation. Capped to the image height via an inline
// max-height and scrolls the excess. @todo: tune the rail width / thumb size.
export const rail = style({
  display: "none",
  "@container": {
    "(min-width: 560px)": {
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      gap: primitives.space["2xs"],
      width: "64px",
      minHeight: 0,
      overflowY: "auto",
      scrollbarWidth: "none",
    },
  },
});

globalStyle(`${rail}::-webkit-scrollbar`, { display: "none" });

export const thumb = style({
  boxSizing: "border-box",
  flexShrink: 0,
  width: "100%",
  aspectRatio: "1",
  minHeight: 0, // let aspect-ratio win over the flex-item default min-height
  padding: primitives.space["4xs"],
  borderRadius: primitives.radius.m,
  border: `${primitives.stroke.thin} solid ${colors.border.subtle}`,
  backgroundColor: colors.surface.extraLight,
  cursor: "pointer",
  transition: "border-color 150ms ease",
  "@media": {
    "(prefers-reduced-motion: reduce)": { transition: "none" },
  },
});

// Selected thumb: thicker, accented border. border-box keeps the width swap from
// shifting the rail layout.
export const thumbActive = style({
  borderColor: colors.common.accent,
  borderWidth: primitives.stroke.medium,
});

export const thumbImage = style({
  width: "100%",
  height: "100%",
  objectFit: "contain",
  display: "block",
  pointerEvents: "none",
  userSelect: "none",
});
