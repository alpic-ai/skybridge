import skybridge from "./skybridge.jpg";

export function ImageTab() {
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
          <img src={skybridge} alt="skybridge" style={{ maxWidth: "100%", height: "auto" }} />
        </div>
      </div>
    </div>
  );
}

