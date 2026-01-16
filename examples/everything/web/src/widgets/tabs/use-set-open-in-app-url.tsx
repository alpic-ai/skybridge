import { useState } from "react";
import { useDisplayMode, useSetOpenInAppUrl } from "skybridge/web";

export function UseSetOpenInAppUrlTab() {
  const setOpenInAppUrl = useSetOpenInAppUrl();
  const [displayMode, setDisplayMode] = useDisplayMode();
  const [url, setUrl] = useState(window.skybridge.serverUrl);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFullscreen = displayMode === "fullscreen";

  return (
    <div className="tab-content">
      <p className="description">
        Set the URL that will be opened when the user clicks on the widget in
        the host application. The open in app button is shown top right in
        fullscreen mode.
      </p>

      <div className="button-row" style={{ marginBottom: "1rem" }}>
        <button
          type="button"
          className={`btn ${isFullscreen ? "" : "btn-outline"}`}
          onClick={() => setDisplayMode(isFullscreen ? "inline" : "fullscreen")}
        >
          {isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        </button>
      </div>

      <form
        className="button-row"
        onSubmit={async (e) => {
          e.preventDefault();
          if (url.trim()) {
            try {
              setError(null);
              await setOpenInAppUrl(url);
              setShowSuccess(true);
            } catch (err) {
              setError(
                err instanceof Error ? err.message : "Failed to set URL",
              );
              setShowSuccess(false);
            }
          }
        }}
      >
        <input
          type="text"
          className="input"
          value={url}
          placeholder="Enter URL"
          onChange={(e) => {
            setUrl(e.target.value);
            setError(null);
            setShowSuccess(false);
          }}
          style={{ flex: 1, maxWidth: "20rem" }}
        />
        <button type="submit" className="btn" disabled={!url.trim()}>
          Set URL
        </button>
      </form>
      {showSuccess && (
        <div
          style={{
            color: "#0a8",
            fontSize: "0.875rem",
            maxWidth: "28rem",
            wordBreak: "break-word",
          }}
        >
          ✓ URL successfully set, enter fullscreen mode and click the open in app button to open the URL in the host application.
        </div>
      )}
      {error && (
        <div
          style={{
            color: "#c00",
            fontSize: "0.875rem",
            maxWidth: "28rem",
            wordBreak: "break-word",
          }}
        >
          × {error}
        </div>
      )}
    </div>
  );
}
