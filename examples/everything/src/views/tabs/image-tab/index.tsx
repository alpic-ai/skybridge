import { useState } from "react";
import { useRequestSize } from "skybridge/web";
import skybridge from "./skybridge.jpg";

export function ImageTab() {
  const requestSize = useRequestSize();
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");

  const parsed = {
    width: width.trim() === "" ? undefined : Number(width),
    height: height.trim() === "" ? undefined : Number(height),
  };
  const isValid =
    (parsed.width !== undefined || parsed.height !== undefined) &&
    (parsed.width === undefined || Number.isFinite(parsed.width)) &&
    (parsed.height === undefined || Number.isFinite(parsed.height));

  return (
    <div className="tab-content">
      <p className="description">
        This tab demonstrates how to display images in your widget by importing
        them directly. You can use the <code>@/</code> alias for absolute paths
        or relative imports.
      </p>

      <div className="field">
        <span className="field-label">Example</span>
        <div style={{ marginTop: "1rem" }}>
          <img
            src={skybridge}
            alt="skybridge"
            style={{ maxWidth: "100%", height: "auto" }}
          />
        </div>
      </div>

      <div className="field">
        <span className="field-label">Request view size</span>
        <p className="description">
          Ask the host to resize the view. On Apps SDK, only height is honored.
        </p>
        <form
          className="button-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (isValid) {
              requestSize(parsed);
            }
          }}
        >
          <input
            type="number"
            className="input"
            value={width}
            placeholder="width (px)"
            onChange={(e) => setWidth(e.target.value)}
            style={{ maxWidth: "8rem" }}
          />
          <input
            type="number"
            className="input"
            value={height}
            placeholder="height (px)"
            onChange={(e) => setHeight(e.target.value)}
            style={{ maxWidth: "8rem" }}
          />
          <button type="submit" className="btn" disabled={!isValid}>
            Request resize
          </button>
        </form>
      </div>
    </div>
  );
}
