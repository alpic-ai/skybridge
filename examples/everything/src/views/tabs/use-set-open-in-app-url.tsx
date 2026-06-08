import {
  Alert,
  AlertDescription,
  ErrorAlert,
} from "@alpic-ai/ui/components/alert";
import { Button } from "@alpic-ai/ui/components/button";
import { Input } from "@alpic-ai/ui/components/input";
import { useState } from "react";
import { useDisplayMode, useSetOpenInAppUrl } from "skybridge/web";
import { Description, TabBody } from "../components/ui.js";

export function UseSetOpenInAppUrlTab() {
  const setOpenInAppUrl = useSetOpenInAppUrl();
  const [displayMode, setDisplayMode] = useDisplayMode();
  const [url, setUrl] = useState(window.skybridge.serverUrl);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFullscreen = displayMode === "fullscreen";

  return (
    <TabBody>
      <Description>
        Set the URL that will be opened when the user clicks the "open in app"
        button. This button appears in the top right corner when the widget is
        displayed in fullscreen mode. The URL must have the same origin as your
        widget's server URL.
      </Description>

      <div>
        <Button
          variant={isFullscreen ? "primary" : "secondary"}
          onClick={() => setDisplayMode(isFullscreen ? "inline" : "fullscreen")}
        >
          {isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        </Button>
      </div>

      <form
        className="flex items-end gap-2"
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
        <div className="max-w-80 flex-1">
          <Input
            type="text"
            value={url}
            placeholder="Enter URL"
            onChange={(e) => {
              setUrl(e.target.value);
              setError(null);
              setShowSuccess(false);
            }}
          />
        </div>
        <Button type="submit" disabled={!url.trim()}>
          Set URL
        </Button>
      </form>

      {showSuccess && (
        <Alert variant="success" className="max-w-md">
          <AlertDescription>
            URL successfully set, enter fullscreen mode and click the open in
            app button to open the URL in the host application.
          </AlertDescription>
        </Alert>
      )}
      {error && <ErrorAlert description={error} className="max-w-md" />}
    </TabBody>
  );
}
