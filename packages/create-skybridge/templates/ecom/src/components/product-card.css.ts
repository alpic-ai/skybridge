import { keyframes, style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { colors, primitives } from "../design/tokens";

// @todo: number of title lines before it truncates with an ellipsis. Exported
// so the skeleton reserves the same number of lines.
export const TITLE_LINES = 2;

// `framed: true` gives each card its own container; the default is a plain
// layout shell (pair it with a framed carousel instead). Pick one, not both.
export const card = recipe({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: primitives.space["3xs"],
    width: "100%",
    textAlign: "left",
  },
  variants: {
    framed: {
      // @todo: tune the card container to your brand.
      true: {
        padding: primitives.space["3xs"],
        borderRadius: primitives.radius.m,
        border: `${primitives.stroke.thin} solid ${colors.border.thin}`,
        backgroundColor: colors.surface.extraLight,
      },
      false: {},
    },
  },
  defaultVariants: { framed: false },
});

export const imageBox = style({
  position: "relative",
  aspectRatio: "1",
  overflow: "hidden",
  borderRadius: primitives.radius.m,
  // Stage behind the product image. @todo: pick the surface token that suits
  // your imagery (a neutral grey for transparent cutouts, `extraLight`/white
  // for full-bleed photos).
  backgroundColor: colors.surface.subtle,
});

export const image = style({
  width: "100%",
  height: "100%",
  // @todo: `contain` never crops; switch to `cover` for uniform, bleed-friendly
  // cutout images.
  objectFit: "contain",
  display: "block",
  // Keep image drag from hijacking the swipe/scroll gesture.
  pointerEvents: "none",
  userSelect: "none",
});

export const imageDimmed = style({ opacity: 0.5 });

export const placeholder = style({
  width: "100%",
  height: "100%",
  backgroundColor: colors.surface.subtle,
});

export const oosBadge = style({
  position: "absolute",
  top: primitives.space["3xs"],
  left: primitives.space["3xs"],
  padding: `${primitives.space["5xs"]} ${primitives.space["3xs"]}`,
  borderRadius: primitives.radius.s,
  backgroundColor: colors.surface.extraLight,
  color: colors.content.intense,
  fontFamily: primitives.font.family.primary,
  fontSize: primitives.font.size.xs,
});

export const body = style({
  display: "flex",
  flexDirection: "column",
  gap: primitives.space["5xs"],
});

export const title = style({
  color: colors.content.intense,
  display: "-webkit-box",
  WebkitLineClamp: TITLE_LINES,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  // Reserve the clamp height (title line-height is 1.5) so prices line up
  // across cards whatever the title length.
  minHeight: `calc(${TITLE_LINES} * 1.5em)`,
});

export const price = style({ color: colors.content.subtle });

// Skeleton (loading state).
const pulse = keyframes({
  "0%": { opacity: 1 },
  "50%": { opacity: 0.4 },
  "100%": { opacity: 1 },
});

export const skeletonBox = style({
  backgroundColor: colors.surface.subtle,
  borderRadius: primitives.radius.s,
  animation: `${pulse} 1.5s ease-in-out infinite`,
  "@media": {
    "(prefers-reduced-motion: reduce)": { animation: "none" },
  },
});

export const skeletonImage = style({
  aspectRatio: "1",
  borderRadius: primitives.radius.m,
});

// Text rows (title lines + price), evenly spaced. Its own container rather than
// `body` so the skeleton can breathe a little more without moving the real card.
export const skeletonBody = style({
  display: "flex",
  flexDirection: "column",
  gap: primitives.space["4xs"],
});

export const skeletonLine = style({ height: primitives.font.size.m });

// Last title line and the price row are stubbed short, the way text ends.
export const skeletonLineShort = style({
  height: primitives.font.size.m,
  width: "60%",
});

export const skeletonPrice = style({
  height: primitives.font.size.m,
  width: "40%",
});
