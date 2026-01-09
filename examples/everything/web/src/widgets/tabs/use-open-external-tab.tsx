import { useState } from "react";
import { useOpenExternal } from "skybridge/web";

export function UseOpenExternalTab() {
  const openExternal = useOpenExternal();
  const [url, setUrl] = useState("https://alpic.ai");

  return (
    <div className="tab-content">
      <p className="description">
        Open external URLs via the host application.
      </p>

      <form
        className="button-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (url.trim()) {
            openExternal(url);
          }
        }}
      >
        <input
          type="text"
          className="input"
          value={url}
          placeholder="Enter URL"
          onChange={(e) => setUrl(e.target.value)}
          style={{ flex: 1, maxWidth: "20rem" }}
        />
        <button type="submit" className="btn" disabled={!url.trim()}>
          Open
        </button>
      </form>
    </div>
  );
}
