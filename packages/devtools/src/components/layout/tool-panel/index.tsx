import { useKeyPress, useLocalStorageState } from "ahooks";
import { X } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Group,
  Panel,
  Separator,
  useDefaultLayout,
} from "react-resizable-panels";

import { useInspectorPreferencesStore } from "@/lib/inspector-preferences-store.js";
import { useSelectedToolOrNull } from "@/lib/mcp/index.js";
import { useCallToolResult } from "@/lib/store.js";
import { LogsDrawer } from "./logs-drawer.js";
import { ToolPanelHeader } from "./tool-panel-header.js";
import { ToolPanelToolbar } from "./tool-panel-toolbar.js";
import { View } from "./view/index.js";

const Placeholder = ({ text }: { text: string }) => (
  <div className="flex h-full items-center justify-center">
    <p className="text-xs text-muted-foreground">{text}</p>
  </div>
);

const VIEW_LOGS_GROUP_ID = "devtools-tool-panel-view-logs";
const VIEW_PANEL_ID = "view";
const LOGS_PANEL_ID = "logs";

export const ToolPanel = () => {
  const tool = useSelectedToolOrNull();
  const data = useCallToolResult(tool?.name ?? "");
  const [logsOpen, setLogsOpen] = useLocalStorageState(
    "devtools-tool-panel-logs-open",
    { defaultValue: false },
  );
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: VIEW_LOGS_GROUP_ID,
    panelIds: [VIEW_PANEL_ID, LOGS_PANEL_ID],
    storage: localStorage,
  });
  const displayMode = useInspectorPreferencesStore((s) => s.displayMode);
  const setPreference = useInspectorPreferencesStore((s) => s.setPreference);
  const isFullscreen = displayMode === "fullscreen";
  const [fullscreenAnchor, setFullscreenAnchor] = useState<HTMLElement | null>(
    null,
  );
  useEffect(() => {
    setFullscreenAnchor(document.getElementById("devtools-card-body"));
  }, []);
  useKeyPress("esc", () => {
    if (isFullscreen) {
      setPreference("displayMode", "inline");
    }
  });
  const templateUri = tool?._meta?.["openai/outputTemplate"] as
    | string
    | undefined;
  const hasResult = Boolean(tool && data?.response);
  const hasView = Boolean(templateUri);

  const toolbar = (
    <ToolPanelToolbar
      logsOpen={logsOpen ?? false}
      onOpenLogs={() => setLogsOpen(true)}
    />
  );
  const viewSuspense = (
    <Suspense fallback={<Placeholder text="Loading widget…" />}>
      <View />
    </Suspense>
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden preview-region">
      {tool ? (
        hasResult ? (
          hasView ? (
            <>
              <ToolPanelHeader />
              {isFullscreen && fullscreenAnchor ? (
                createPortal(
                  <div className="absolute inset-0 z-50 flex flex-col bg-background">
                    {toolbar}
                    <div className="flex min-h-0 flex-1 overflow-hidden pt-3">
                      {viewSuspense}
                    </div>
                    <button
                      type="button"
                      aria-label="Exit fullscreen"
                      onClick={() => setPreference("displayMode", "inline")}
                      className="absolute right-4 top-4 inline-flex size-8 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-light-gray-foreground shadow-md transition-colors hover:bg-light-gray hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <X className="size-4" />
                    </button>
                  </div>,
                  fullscreenAnchor,
                )
              ) : (
                <Group
                  orientation="horizontal"
                  id={VIEW_LOGS_GROUP_ID}
                  className="flex min-h-0 min-w-0 flex-1 overflow-hidden"
                  defaultLayout={defaultLayout}
                  onLayoutChanged={onLayoutChanged}
                >
                  <Panel
                    id={VIEW_PANEL_ID}
                    minSize={320}
                    className="min-h-0 min-w-0"
                  >
                    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
                      {toolbar}
                      <div className="mx-3 flex min-h-0 flex-1 items-center justify-center overflow-y-auto py-3">
                        {viewSuspense}
                      </div>
                    </div>
                  </Panel>
                  {logsOpen && (
                    <>
                      <Separator className="w-px shrink-0 bg-border transition-colors hover:bg-ring data-separator-active:bg-ring" />
                      <Panel
                        id={LOGS_PANEL_ID}
                        defaultSize={360}
                        minSize={240}
                        maxSize={640}
                        className="min-h-0"
                      >
                        <LogsDrawer
                          key={tool?.name ?? "none"}
                          onClose={() => setLogsOpen(false)}
                        />
                      </Panel>
                    </>
                  )}
                </Group>
              )}
            </>
          ) : (
            <Placeholder text="No view template" />
          )
        ) : null
      ) : (
        <Placeholder text="Choose a tool from the sidebar to begin" />
      )}
    </div>
  );
};
