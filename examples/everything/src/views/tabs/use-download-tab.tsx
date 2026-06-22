import { Button } from "@alpic-ai/ui/components/button";
import { useState } from "react";
import { useDownload } from "skybridge/web";
import { Code, Description, TabBody } from "../components/ui.js";

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
    <TabBody>
      <Description>
        Ask the host to save a file to the user's filesystem. MCP Apps only — on
        Apps SDK this will fail with <Code>{`{ isError: true }`}</Code>.
      </Description>

      <div className="flex flex-wrap gap-2">
        <Button onClick={downloadJson}>Download hello.json (inline)</Button>
        <Button onClick={downloadResourceLink}>
          Download README (resource link)
        </Button>
      </div>

      {status && (
        <p className="type-text-sm text-muted-foreground">Status: {status}</p>
      )}
    </TabBody>
  );
}
