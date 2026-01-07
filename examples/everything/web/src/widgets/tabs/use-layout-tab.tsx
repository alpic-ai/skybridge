import { useLayout } from "skybridge/web";

export function UseLayoutTab() {
  const { theme } = useLayout();

  return (
    <div className="tab-content">
      <p className="description">
        Access layout and visual environment info. Values update dynamically on
        resize or theme toggle.
      </p>

      <div className="field">
        <span className="field-label">Theme</span>
        <code className={theme}>
          Runtime theme is set to {theme} {theme === "light" ? "☀️" : "🌙"}
        </code>
      </div>
    </div>
  );
}
