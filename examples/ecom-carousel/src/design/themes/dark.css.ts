import { createTheme } from "@vanilla-extract/css";
import { colors } from "../contract.css";
import { primitives } from "../primitives.css";

/**
 * Dark palette (Alpic dark-section treatment): teal-green near-black surfaces,
 * white text, mint accent, magenta highlight. Same slots as light.css.ts.
 */
export const darkTheme = createTheme(colors, {
  surface: {
    extraLight: primitives.grey.black, // base (#051413)
    light: primitives.grey["900"], // raised page (#081c1b)
    subtle: primitives.grey["700"], // cards / panels (#303837)
    intense: primitives.grey["500"],
  },
  content: {
    intense: primitives.grey["50"], // near-white text
    subtle: primitives.grey["300"], // muted
    invertIntense: primitives.grey.black, // text on light fills
    invertSubtle: primitives.grey["500"],
  },
  border: {
    thin: primitives.grey["700"],
    subtle: primitives.grey["600"],
    intense: primitives.grey["400"],
  },
  common: {
    accent: primitives.mint["300"], // bright mint pops on dark
    invertAccent: primitives.grey.black, // dark text on bright mint (white fails)
    highlight: primitives.accent["400"], // lighter magenta highlight on dark
    error: primitives.status.error,
    success: primitives.status.success,
  },
});
