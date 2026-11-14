import { style } from "@vanilla-extract/css";
import { colors, primitives } from "../design/tokens";

export const workspace = style({
  padding: primitives.space.s,
  background: colors.surface.light,
  minHeight: "100dvh",
  containerType: "inline-size",
});
export const header = style({
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "space-between",
  alignItems: "center",
  gap: primitives.space.xs,
  marginBottom: primitives.space.s,
});
export const heading = style({
  fontSize: primitives.font.size.l,
  fontWeight: primitives.font.weight.medium,
  margin: 0,
});
export const controls = style({
  display: "flex",
  flexWrap: "wrap",
  gap: primitives.space["3xs"],
  alignItems: "center",
  marginBottom: primitives.space.s,
});
export const button = style({
  padding: "10px 14px",
  minHeight: "44px",
  background: colors.surface.extraLight,
  color: colors.content.intense,
  border: `1px solid ${colors.border.subtle}`,
  borderRadius: primitives.radius.m,
  font: "inherit",
  cursor: "pointer",
  selectors: {
    "&:disabled": { opacity: 0.5, cursor: "not-allowed" },
    "&:focus-visible": {
      outline: `2px solid ${colors.common.accent}`,
      outlineOffset: 2,
    },
    "&[aria-pressed=true]": { borderColor: colors.common.accent },
  },
});
export const primary = style([
  button,
  {
    background: colors.common.accent,
    color: colors.common.invertAccent,
    borderColor: colors.common.accent,
  },
]);
export const input = style([
  button,
  { cursor: "text", minWidth: 0, flex: "1 1 180px" },
]);
export const grid = style({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 220px), 1fr))",
  gap: primitives.space.xs,
  maxWidth: "1200px",
  marginInline: "auto",
});
export const cardButton = style({
  padding: 0,
  textAlign: "left",
  background: "none",
  border: "none",
  font: "inherit",
  cursor: "pointer",
  borderRadius: primitives.radius.m,
  selectors: {
    "&:focus-visible": {
      outline: `2px solid ${colors.common.accent}`,
      outlineOffset: 2,
    },
  },
});
export const actions = style({
  display: "flex",
  flexWrap: "wrap",
  gap: primitives.space["3xs"],
  alignItems: "center",
});
export const status = style({
  color: colors.content.subtle,
  fontSize: primitives.font.size.s,
  width: "100%",
});
export const list = style({
  display: "flex",
  flexDirection: "column",
  gap: primitives.space.s,
  padding: 0,
  listStyle: "none",
});
export const item = style({
  display: "flex",
  gap: primitives.space.xs,
  paddingBlock: primitives.space.xs,
  borderBottom: `1px solid ${colors.border.subtle}`,
  alignItems: "start",
});
export const thumbnail = style({
  width: "80px",
  height: "100px",
  objectFit: "contain",
  background: colors.surface.extraLight,
  borderRadius: primitives.radius.m,
});
export const itemBody = style({
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: primitives.space["3xs"],
});
export const summary = style({
  borderTop: `2px solid ${colors.border.subtle}`,
  paddingTop: primitives.space.s,
  fontWeight: primitives.font.weight.medium,
});
export const compact = style({ width: "62px", flex: "0 0 auto" });
