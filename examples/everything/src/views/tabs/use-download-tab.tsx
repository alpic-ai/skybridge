import { useState } from "react";
import { useDownload } from "skybridge/web";

export function UseDownloadTab() {
  const { download } = useDownload();
  const [status, setStatus] = useState<string | null>(null);

  const downloadJson = async () => {
    setStatus("Requesting…");
    try {
      const { isError } = await download({
        contents: [
          {
            type: "resource",
            resource: {
              uri: "file:///hello.json",
              mimeType: "application/json",
              text: JSON.stringify({ hello: "world", at: Date.now() }, null, 2),
            },
          },
        ],
      });
      setStatus(isError ? "Cancelled or denied" : "Download started");
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const downloadResourceLink = async () => {
    setStatus("Requesting…");
    try {
      const { isError } = await download({
        contents: [
          {
            type: "resource_link",
            uri: "https://raw.githubusercontent.com/alpic-ai/skybridge/main/README.md",
            name: "Skybridge README.md",
            mimeType: "text/markdown",
          },
        ],
      });
      setStatus(isError ? "Cancelled or denied" : "Download started");
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="tab-content">
      <p className="description">
        Ask the host to save a file to the user's filesystem. MCP Apps only — on
        Apps SDK this will fail with {`{ isError: true }`}.
      </p>

      <div className="button-row">
        <button type="button" className="btn" onClick={downloadJson}>
          Download hello.json (inline)
        </button>
        <button type="button" className="btn" onClick={downloadResourceLink}>
          Download README (resource link)
        </button>
      </div>

      {status && <p className="description">Status: {status}</p>}
    </div>
  );
}
