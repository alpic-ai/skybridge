import type { GlobalProvider } from "@ladle/react";
import "../src/index.css";
import { viewFrame } from "../src/components/view-frame.css";
import { darkTheme, lightTheme } from "../src/design/tokens";
import { cx } from "../src/lib/cx";

/**
 * Ladle's built-in theme toggle (sun/moon in the toolbar) drives
 * globalState.theme. We reuse it to flip the widget's own palette, so the
 * preview theme and the widget theme always match. The Provider applies the
 * real ViewFrame surface (viewFrame + theme class), and index.css loads the
 * brand @font-face rules, so stories preview against the actual frame.
 */
export const Provider: GlobalProvider = ({ children, globalState }) => {
  const themeClass = globalState.theme === "dark" ? darkTheme : lightTheme;

  return (
    <div
      className={cx(viewFrame, themeClass)}
      data-theme={globalState.theme}
      style={{ minHeight: "100vh", padding: 32 }}
    >
      {children}
    </div>
  );
};
