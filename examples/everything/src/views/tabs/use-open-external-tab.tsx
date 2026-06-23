import { Button } from "@alpic-ai/ui/components/button";
import { Input } from "@alpic-ai/ui/components/input";
import { useState } from "react";
import { useOpenExternal } from "skybridge/web";
import { Description, TabBody } from "../components/ui.js";

export function UseOpenExternalTab() {
  const openExternal = useOpenExternal();
  const [url, setUrl] = useState("https://alpic.ai");

  return (
    <TabBody>
      <Description>Open external URLs via the host application.</Description>

      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (url.trim()) {
            openExternal(url);
          }
        }}
      >
        <div className="max-w-80 flex-1">
          <Input
            type="text"
            value={url}
            placeholder="Enter URL"
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={!url.trim()}>
          Open
        </Button>
      </form>
    </TabBody>
  );
}
