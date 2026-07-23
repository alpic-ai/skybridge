import { globalStyle, style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { colors, primitives } from "../design/tokens";

// Carousel tuning knobs.
const gap = primitives.space["2xs"]; // gap between cards
// Cards visible at each width; the fractional part is the peek that signals the
// row scrolls. If you change a count, adjust the gap multiplier in its
// `--card-width` calc (full gaps visible = the whole-number part).
const CARDS_VISIBLE = 2.5;
const CARDS_VISIBLE_COMPACT = 1.5;
// Below this container width, switch to the compact count.
const COMPACT_MAX_WIDTH = "560px";

// Structural wrapper (kept as a plain class so the nav-reveal globalStyle below
// can target it). The recipe composes it as its base.
const carouselBase = style({
  position: "relative",
  // Size cards against the carousel width, not the iframe viewport.
  containerType: "inline-size",
});

// `framed: true` frames the whole carousel; the default is flush (pair it with
// framed cards instead). Pick one of the two.
export const carousel = recipe({
  base: carouselBase,
  variants: {
    framed: {
      // Unused (D2 frames each card, not the strip); kept for completeness.
      true: {
        // Pad top/bottom only; the leading/trailing inset lives on the track's
        // own `framed` variant so it scrolls away. Cards bleed to the left/right
        // border, and `overflow: hidden` masks them to the rounded corners, so
        // a scrolled card disappears exactly at the frame edge.
        paddingBlock: primitives.space.xs,
        borderRadius: primitives.radius.l,
        border: `${primitives.stroke.thin} solid ${colors.border.thin}`,
        backgroundColor: colors.surface.extraLight,
        boxShadow: "0 10px 20px -20px rgba(0, 0, 0, 0.18)",
        overflow: "hidden",
      },
      false: {},
    },
  },
  defaultVariants: { framed: false },
});

// Kept as a plain class so the scrollbar-hiding globalStyle below can target it.
// The recipe composes it as its base.
const trackBase = style({
  display: "flex",
  gap,
  overflowX: "auto",
  scrollSnapType: "x mandatory",
  scrollBehavior: "smooth",
  scrollbarWidth: "none",
  vars: { "--card-width": `calc((100% - 2 * ${gap}) / ${CARDS_VISIBLE})` },
  "@container": {
    [`(max-width: ${COMPACT_MAX_WIDTH})`]: {
      vars: {
        "--card-width": `calc((100% - ${gap}) / ${CARDS_VISIBLE_COMPACT})`,
      },
    },
  },
  "@media": {
    "(prefers-reduced-motion: reduce)": { scrollBehavior: "auto" },
  },
});

globalStyle(`${trackBase}::-webkit-scrollbar`, { display: "none" });

// `framed: true` adds an inset on both ends. Padding on the scroll track (not on
// the frame) so it shows before the first card and after the last at rest, but
// scrolls away in between: a card scrolled past clips at the border, not at a
// fixed gutter. scroll-padding keeps mandatory snap from collapsing the inset.
export const track = recipe({
  base: trackBase,
  variants: {
    framed: {
      true: {
        paddingInline: primitives.space.xs,
        scrollPaddingInline: primitives.space.xs,
      },
      false: {},
    },
    // Skeleton state: lock the scroll, there is nothing to scroll to yet.
    loading: {
      true: { overflowX: "hidden" },
      false: {},
    },
  },
  defaultVariants: { framed: false, loading: false },
});

export const cell = style({
  flex: "0 0 var(--card-width)",
  scrollSnapAlign: "start",
});

// Prev/next buttons: desktop only. Hidden on touch, revealed on hover/focus,
// disabled at the scroll ends.
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
  opacity: 0,
  transition: "opacity 150ms ease",
  selectors: {
    "&:disabled": { opacity: 0, pointerEvents: "none" },
  },
  "@media": {
    "(hover: none)": { display: "none" },
  },
});

export const navPrev = style({ left: primitives.space["3xs"] });
export const navNext = style({ right: primitives.space["3xs"] });

// Reveal the (enabled) buttons on hover or keyboard focus within the carousel.
globalStyle(
  `${carouselBase}:hover ${nav}:not(:disabled), ${carouselBase}:focus-within ${nav}:not(:disabled)`,
  { opacity: 1 },
);
