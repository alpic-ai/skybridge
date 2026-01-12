import { type DisplayMode, useDisplayMode } from "skybridge/web";

const ColByMode = new Map<DisplayMode, number>()
  .set("inline", 1)
  .set("pip", 2)
  .set("fullscreen", 3);

export function UseDisplayModeTab() {
  const [displayMode, setDisplayMode] = useDisplayMode();
  const columns = ColByMode.get(displayMode) ?? 1;

  return (
    <div className="tab-content">
      <p className="description">
        Control how your widget is displayed. The host may reject mode change
        requests.
      </p>

      <div className="field">
        <span className="field-label">View</span>
        <code style={{ columnCount: columns, columnGap: "1rem" }}>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
          minim veniam, quis nostrud exercitation ullamco laboris nisi ut
          aliquip ex ea commodo consequat. Duis aute irure dolor in
          reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
          pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
          culpa qui officia deserunt mollit anim id est laborum.
        </code>
      </div>

      <div className="button-row">
        {Array.from(ColByMode.entries()).map(([mode, col]) => (
          <button
            key={mode.toString()}
            type="button"
            className={`btn ${displayMode === mode ? "" : "btn-outline"}`}
            onClick={() => setDisplayMode(mode)}
          >
            {mode} ({col} column{col > 1 ? "s" : ""})
          </button>
        ))}
      </div>
    </div>
  );
}
