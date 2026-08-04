import { createTheme } from "@vanilla-extract/css";
import { colors } from "../contract.css";
import { primitives } from "../primitives.css";

/**
 * Light palette (Alpic light-section treatment): white cards on an off-white
 * page, teal-green text, mint accent. Fills the same slots as dark.css.ts.
 */
export const lightTheme = createTheme(colors, {
  surface: {
    extraLight: primitives.grey.white, // cards
    light: primitives.grey["50"], // page background (#f5f9fa)
    subtle: primitives.grey["100"], // mint-tinted stage behind images
    intense: primitives.grey["200"],
  },
  content: {
    intense: primitives.grey.black, // primary text (#051413)
    subtle: primitives.grey["500"], // muted
    invertIntense: primitives.grey["50"], // text on dark fills
    invertSubtle: primitives.grey["300"],
  },
  border: {
    thin: primitives.grey["200"], // #e6e8e6 hairline
    subtle: primitives.grey["300"],
    intense: primitives.grey["400"],
  },
  common: {
    accent: primitives.mint["700"], // brand mint CTA fill (readable on light)
    invertAccent: primitives.grey.white, // white text on mint
    highlight: primitives.accent["500"], // magenta highlight
    error: primitives.status.error,
    success: primitives.status.success,
  },
});
