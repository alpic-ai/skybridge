import { useKeyPress, useLocalStorageState } from "ahooks";
import { X } from "lucide-react";
import { Suspense } from "react";
import {
  Group,
  Panel,
  Separator,
  useDefaultLayout,
} from "react-resizable-panels";

import { CopyButton } from "@/lib/copy.js";
import { useInspectorPreferencesStore } from "@/lib/inspector-preferences-store.js";
import { useSelectedToolOrNull } from "@/lib/mcp/index.js";
import { useCallToolResult } from "@/lib/store.js";
import { cn, formatBytes } from "@/lib/utils.js";
import { JsonSyntaxBlock } from "./json-syntax-block.js";
import { LogsDrawer } from "./logs-drawer.js";
import {
  ToolPanelHeader,
  ToolPanelOutputContent,
} from "./tool-panel-header.js";
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

const OUTPUT_LOGS_GROUP_ID = "devtools-tool-panel-output-logs";
const OUTPUT_PANEL_ID = "output";

const HEADER_OUTPUT_GROUP_ID = "devtools-tool-panel-header-output";
const HEADER_OUTPUT_PANEL_ID = "header-output";
const HEADER_VIEW_PANEL_ID = "header-view";

export const ToolPanel = () => {
  const tool = useSelectedToolOrNull();
  const data = useCallToolResult(tool?.name ?? "");
  const [logsOpen, setLogsOpen] = useLocalStorageState(
    "devtools-tool-panel-logs-open",
    { defaultValue: false },
  );
  const [headerExpanded, setHeaderExpanded] = useLocalStorageState(
    "devtools-tool-panel-header-expanded",
    { defaultValue: false },
  );
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: VIEW_LOGS_GROUP_ID,
    panelIds: [VIEW_PANEL_ID, LOGS_PANEL_ID],
    storage: localStorage,
  });
  const {
    defaultLayout: headerOutputLayout,
    onLayoutChanged: onHeaderOutputLayoutChanged,
  } = useDefaultLayout({
    id: HEADER_OUTPUT_GROUP_ID,
    panelIds: [HEADER_OUTPUT_PANEL_ID, HEADER_VIEW_PANEL_ID],
    storage: localStorage,
  });
  const {
    defaultLayout: outputLogsDefaultLayout,
    onLayoutChanged: outputLogsOnLayoutChanged,
  } = useDefaultLayout({
    id: OUTPUT_LOGS_GROUP_ID,
    panelIds: [OUTPUT_PANEL_ID, LOGS_PANEL_ID],
    storage: localStorage,
  });
  const displayMode = useInspectorPreferencesStore((s) => s.displayMode);
  const theme = useInspectorPreferencesStore((s) => s.theme);
  const setPreference = useInspectorPreferencesStore((s) => s.setPreference);
  const isMobile =
    useInspectorPreferencesStore(
      (s) => s.userAgent?.device?.type ?? "desktop",
    ) === "mobile";
  const isFullscreen = displayMode === "fullscreen";
  const isFullscreenDesktop = isFullscreen && !isMobile;
  useKeyPress("esc", (e) => {
    if (e.defaultPrevented) {
      return;
    }
    if (isFullscreen) {
      setPreference("displayMode", "inline");
    }
  });
  const templateUri = tool?._meta?.["openai/outputTemplate"] as
    | string
    | undefined;
  const hasResult = Boolean(tool && data?.response);
  const hasView = Boolean(templateUri);

  if (!tool) {
    return (
      <div
        className="flex h-full min-h-0 w-full flex-col overflow-hidden preview-region transition-colors duration-150 ease-out"
        data-theme={theme}
      >
        <Placeholder text="Choose a tool from the sidebar to begin" />
      </div>
    );
  }

  if (!hasResult) {
    return (
      <div
        className="flex h-full min-h-0 w-full flex-col overflow-hidden preview-region transition-colors duration-150 ease-out"
        data-theme={theme}
      />
    );
  }

  if (!hasView) {
    const response = data?.response;
    const responseJson = JSON.stringify(response ?? null, null, 2);
    const sizeBytes = new TextEncoder().encode(responseJson).length;
    const isError = response?.isError === true;
    const durationMs = data?.durationMs;
    return (
      <div
        className="flex h-full min-h-0 w-full flex-col overflow-hidden preview-region transition-colors duration-150 ease-out"
        data-theme={theme}
      >
        <Group
          orientation="horizontal"
          id={OUTPUT_LOGS_GROUP_ID}
          className="flex min-h-0 min-w-0 flex-1 overflow-hidden"
          defaultLayout={outputLogsDefaultLayout}
          onLayoutChanged={outputLogsOnLayoutChanged}
        >
          <Panel id={OUTPUT_PANEL_ID} minSize={320} className="min-h-0 min-w-0">
            <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
              <div className="flex h-9 w-full shrink-0 items-center border-b-2 border-border bg-white px-3 text-sm text-muted-foreground">
                <div className="font-medium">Tool output</div>
                <div className="ml-auto flex items-center gap-2 font-mono text-xs text-light-gray-foreground">
                  <span
                    className={isError ? "text-destructive" : "text-success"}
                  >
                    {isError ? "Error" : "OK"}
                  </span>
                  {durationMs != null ? (
                    <>
                      <span>·</span>
                      <span>{durationMs}ms</span>
                    </>
                  ) : null}
                  <span>·</span>
                  <span>{formatBytes(sizeBytes)}</span>
                </div>
              </div>
              <section className="relative min-h-0 min-w-0 flex-1 overflow-auto bg-light-gray p-3">
                <CopyButton
                  value={responseJson}
                  label="Copy tool output"
                  className="absolute right-2 top-2 z-10"
                />
                <JsonSyntaxBlock code={responseJson} />
              </section>
            </div>
          </Panel>
          <Separator className="w-px shrink-0 bg-border transition-colors hover:bg-ring data-separator-active:bg-ring" />
          <Panel
            id={LOGS_PANEL_ID}
            defaultSize={360}
            minSize={240}
            maxSize={640}
            className="min-h-0"
          >
            <LogsDrawer key={tool.name} />
          </Panel>
        </Group>
      </div>
    );
  }

  return (
    <div
      className="flex h-full min-h-0 w-full flex-col overflow-hidden preview-region transition-colors duration-150 ease-out"
      data-theme={theme}
    >
      <ToolPanelHeader
        expanded={headerExpanded ?? false}
        onToggle={() => setHeaderExpanded(!headerExpanded)}
      />
      <Group
        orientation="vertical"
        id={HEADER_OUTPUT_GROUP_ID}
        className="flex min-h-0 min-w-0 flex-1 overflow-hidden"
        defaultLayout={headerOutputLayout}
        onLayoutChanged={onHeaderOutputLayoutChanged}
      >
        {headerExpanded && (
          <>
            <Panel
              id={HEADER_OUTPUT_PANEL_ID}
              defaultSize={200}
              minSize={80}
              maxSize={500}
              className="min-h-0"
            >
              <ToolPanelOutputContent />
            </Panel>
            <Separator className="h-px shrink-0 bg-border transition-colors hover:bg-ring data-separator-active:bg-ring" />
          </>
        )}
        <Panel
          id={HEADER_VIEW_PANEL_ID}
          minSize={200}
          className="min-h-0 min-w-0"
        >
          <Group
            orientation="horizontal"
            id={VIEW_LOGS_GROUP_ID}
            className="flex h-full min-h-0 min-w-0 overflow-hidden"
            defaultLayout={defaultLayout}
            onLayoutChanged={onLayoutChanged}
          >
            <Panel id={VIEW_PANEL_ID} minSize={320} className="min-h-0 min-w-0">
              <div
                className={cn(
                  "flex flex-col overflow-hidden",
                  isFullscreen
                    ? "absolute inset-0 z-50 bg-background"
                    : "relative h-full min-h-0",
                )}
              >
                <ToolPanelToolbar
                  logsOpen={logsOpen ?? false}
                  onOpenLogs={() => setLogsOpen(true)}
                />
                <div
                  className={cn(
                    "flex min-h-0 flex-1 items-center justify-center",
                    isFullscreenDesktop
                      ? "overflow-hidden pt-3"
                      : isFullscreen
                        ? "overflow-y-auto pt-3"
                        : "mx-3 overflow-y-auto py-3",
                  )}
                >
                  <Suspense fallback={<Placeholder text="Loading view…" />}>
                    <View />
                  </Suspense>
                </div>
                {isFullscreen && (
                  <button
                    type="button"
                    aria-label="Exit fullscreen"
                    onClick={() => setPreference("displayMode", "inline")}
                    className="absolute right-4 top-4 inline-flex size-8 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-light-gray-foreground shadow-md transition-colors hover:bg-light-gray hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
            </Panel>
            {logsOpen && !isFullscreen && (
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
                    key={tool.name}
                    onClose={() => setLogsOpen(false)}
                  />
                </Panel>
              </>
            )}
          </Group>
        </Panel>
      </Group>
    </div>
  );
};
