import { X } from "lucide-react";
import {
  type ReactNode,
  Suspense,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  getToolOutputTokenCount,
  TOOL_OUTPUT_WARNING_TOKENS,
} from "@/lib/context-warnings.js";
import { CopyButton } from "@/lib/copy.js";
import {
  useInspectorPreferencesStore,
  useIsMobile,
} from "@/lib/inspector-preferences-store.js";
import { useSelectedToolOrNull } from "@/lib/mcp/index.js";
import { useCallToolResult } from "@/lib/store.js";
import { cn, formatBytes, PHONE_VIEWPORT } from "@/lib/utils.js";
import { JsonSyntaxBlock } from "../tool-panel/json-syntax-block.js";
import { LogsDrawer } from "../tool-panel/logs-drawer.js";
import { ToolPanelToolbar } from "../tool-panel/tool-panel-toolbar.js";
import { View } from "../tool-panel/view/index.js";
import { ChatgptShell } from "./chatgpt-shell.js";
import { ClaudeShell } from "./claude-shell.js";

const FRAME_MARGIN_X = 24;
const FRAME_MARGIN_Y = 44;

const frameColors = {
  light: { backdrop: "#e8e8e6", label: "#6f6f6f" },
  dark: { backdrop: "#111110", label: "#8f8f8f" },
};

const PhoneFrame = ({
  theme,
  children,
}: {
  theme: "light" | "dark";
  children: ReactNode;
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) {
      return;
    }
    const update = () => {
      const { width, height } = wrapper.getBoundingClientRect();
      setScale(
        Math.min(
          1,
          (width - FRAME_MARGIN_X) / PHONE_VIEWPORT.width,
          (height - FRAME_MARGIN_Y) / PHONE_VIEWPORT.height,
        ),
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="flex h-full min-h-0 w-full flex-col items-center justify-center overflow-hidden"
      style={{ backgroundColor: frameColors[theme].backdrop }}
    >
      <div
        className="pb-1.5 font-mono text-xs"
        style={{ color: frameColors[theme].label }}
      >
        {PHONE_VIEWPORT.width} × {PHONE_VIEWPORT.height}
      </div>
      <div
        style={{
          width: PHONE_VIEWPORT.width * scale,
          height: PHONE_VIEWPORT.height * scale,
        }}
      >
        <div
          className="overflow-hidden shadow-[0_2px_16px_rgba(0,0,0,0.2)]"
          style={{
            width: PHONE_VIEWPORT.width,
            height: PHONE_VIEWPORT.height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export const Preview = () => {
  const tool = useSelectedToolOrNull();
  const data = useCallToolResult(tool?.name ?? "");
  const previewClient = useInspectorPreferencesStore((s) => s.previewClient);
  const theme = useInspectorPreferencesStore((s) => s.theme);
  const isMobile = useIsMobile();
  const [showDevTools, setShowDevTools] = useState(false);
  const templateUri = (tool?._meta?.ui as { resourceUri?: string } | undefined)
    ?.resourceUri;
  const hasWidget = Boolean(tool && data?.response && templateUri);
  const Shell = previewClient === "claude" ? ClaudeShell : ChatgptShell;

  const shell = (
    <Shell>
      {hasWidget ? (
        <Suspense fallback={null}>
          <View />
        </Suspense>
      ) : null}
    </Shell>
  );

  const response = data?.response;
  const hasToolOutput = Boolean(tool && response);

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex h-11 shrink-0 items-center gap-3 bg-primary px-3 text-primary-foreground">
        <span className="font-medium text-xs">Preview mode</span>
        <div className="min-w-0 flex-1">
          <ToolPanelToolbar
            variant="preview"
            showDevTools={showDevTools}
            onToggleDevTools={() => setShowDevTools((v) => !v)}
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 flex">
        <div className="min-h-0 flex-1">
          {isMobile ? <PhoneFrame theme={theme}>{shell}</PhoneFrame> : shell}
        </div>
        {showDevTools && (
          <div className="flex w-[480px] min-w-[320px] max-w-[600px] min-h-0 flex-col border-l border-border bg-background">
            <div className="flex h-9 shrink-0 items-center justify-between border-b border-border px-3">
              <span className="text-xs font-semibold text-foreground">
                DevTools
              </span>
              <button
                type="button"
                aria-label="Close DevTools"
                onClick={() => setShowDevTools(false)}
                className="inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-light-gray hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 flex flex-col overflow-hidden">
              {hasToolOutput ? (
                <>
                  <section className="min-h-0 flex-1 flex flex-col overflow-hidden">
                    <div
                      className={cn(
                        "flex h-9 w-full shrink-0 items-center border-b-2 border-border bg-white px-3 text-sm text-muted-foreground",
                      )}
                    >
                      <div className="flex items-center gap-2 font-medium">
                        Tool output
                        {getToolOutputTokenCount(response) >=
                          TOOL_OUTPUT_WARNING_TOKENS && (
                          <span className="rounded bg-amber-100 px-1 text-[10px] font-medium text-amber-700">
                            large
                          </span>
                        )}
                      </div>
                      <div className="ml-auto flex items-center gap-2 font-mono text-xs text-light-gray-foreground">
                        <span
                          className={
                            response?.isError
                              ? "text-destructive"
                              : "text-success"
                          }
                        >
                          {response?.isError ? "Error" : "OK"}
                        </span>
                        {data?.durationMs != null ? (
                          <>
                            <span>·</span>
                            <span>{data.durationMs}ms</span>
                          </>
                        ) : null}
                        <span>·</span>
                        <span>
                          {formatBytes(
                            new TextEncoder().encode(
                              JSON.stringify(response ?? null),
                            ).length,
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="relative min-h-0 flex-1 overflow-auto p-3 bg-light-gray">
                      <CopyButton
                        value={JSON.stringify(response ?? null, null, 2)}
                        label="Copy tool output"
                        className="absolute right-2 top-2 z-10"
                      />
                      <JsonSyntaxBlock
                        code={JSON.stringify(
                          response ?? null,
                          null,
                          2,
                        )}
                      />
                    </div>
                  </section>
                  <section className="h-1/3 min-h-[120px] flex flex-col overflow-hidden border-t border-border">
                    <LogsDrawer />
                  </section>
                </>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-xs text-muted-foreground">
                    Select and run a tool to see output and logs.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
