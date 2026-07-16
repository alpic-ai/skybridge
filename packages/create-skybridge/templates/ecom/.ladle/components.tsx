import type { GlobalProvider } from "@ladle/react";
import { darkTheme } from "../src/design/themes/dark.css";
import { lightTheme } from "../src/design/themes/light.css";

/**
 * Ladle's built-in theme toggle (sun/moon in the toolbar) drives
 * globalState.theme. We reuse it to flip the widget's own palette, so the
 * preview theme and the widget theme always match.
 */
export const Provider: GlobalProvider = ({ children, globalState }) => {
  const themeClass = globalState.theme === "dark" ? darkTheme : lightTheme;

  return (
    <div
      className={themeClass}
      data-theme={globalState.theme}
      style={{
        minHeight: "100vh",
        padding: 32,
        backgroundColor: globalState.theme === "dark" ? "#000000" : "#ffffff",
        color: globalState.theme === "dark" ? "#f8f8f8" : "#1a1a1a",
      }}
    >
      {children}
    </div>
  );
};
