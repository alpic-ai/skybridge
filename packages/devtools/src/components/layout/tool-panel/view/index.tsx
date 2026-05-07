import { useEffect, useRef, useState } from "react";
import type { AppsSdkContext } from "skybridge/web";
import { useIframeAutoHeight } from "@/hooks/use-iframe-auto-height.js";
import { useIframeMounted } from "@/hooks/use-iframe-mounted.js";
import { useInspectorPreferencesStore } from "@/lib/inspector-preferences-store.js";
import mcpClient, {
  useSelectedTool,
  useSuspenseResource,
} from "@/lib/mcp/index.js";
import { useCallToolResult, useStore } from "@/lib/store.js";
import { asString, cn, injectWaitForOpenai } from "@/lib/utils.js";
import { createAndInjectOpenAi } from "./create-openai-mock.js";

const MOBILE_WIDTH_PX = 345;
const DESKTOP_WIDTH_PX = 770;
const PIP_MAX_HEIGHT_PX = 420;
const VIEW_DARK_BG = "#212121";

export const View = () => {
  const tool = useSelectedTool();
  const toolResult = useCallToolResult(tool.name);
  const { openaiObject } = toolResult ?? {};
  const { data: resource } = useSuspenseResource(
    tool._meta?.["openai/outputTemplate"] as string | undefined,
  );
  const { setToolData, pushOpenAiLog, updateOpenaiObject, setOpenInAppUrl } =
    useStore();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const openaiObjectRef = useRef(openaiObject);
  openaiObjectRef.current = openaiObject;
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const isMobile =
    useInspectorPreferencesStore(
      (s) => s.userAgent?.device?.type ?? "desktop",
    ) === "mobile";
  const previousIsMobileRef = useRef(isMobile);
  useEffect(() => {
    if (previousIsMobileRef.current === isMobile) {
      return;
    }
    previousIsMobileRef.current = isMobile;
    // Reset so the iframe collapses and body can re-layout at the new width.
    setContentHeight(null);
  }, [isMobile]);
  const displayMode = useInspectorPreferencesStore((s) => s.displayMode);
  const isFullscreen = displayMode === "fullscreen";
  const isPip = displayMode === "pip";
  const width =
    isFullscreen && !isMobile
      ? "100%"
      : `${isMobile ? MOBILE_WIDTH_PX : DESKTOP_WIDTH_PX}px`;
  const theme = useInspectorPreferencesStore((s) => s.theme);

  const resourceEntry = resource.contents[0] as {
    text: string;
    _meta?: Record<string, unknown>;
  };
  const html = resourceEntry.text;
  const viewDomain = asString(resourceEntry._meta?.["openai/widgetDomain"]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow || !iframe.contentDocument) {
      return;
    }

    if (viewDomain) {
      setOpenInAppUrl(tool.name, viewDomain);
    }

    createAndInjectOpenAi(
      iframe.contentWindow,
      openaiObjectRef.current,
      (command, args, type = "default") => {
        pushOpenAiLog(tool.name, {
          timestamp: Date.now(),
          source: "view",
          command,
          args,
          type,
        });
      },
      (key, value) => {
        updateOpenaiObject(tool.name, key, value);
      },
      (name, args) => mcpClient.callTool(name, args),
      (href) => {
        setOpenInAppUrl(tool.name, href);
      },
    );

    iframe.contentDocument.open();
    iframe.contentDocument.write(injectWaitForOpenai(html));
    iframe.contentDocument.close();

    setToolData(tool.name, {
      openaiRef: iframeRef as React.RefObject<HTMLIFrameElement>,
    });
  }, [
    html,
    viewDomain,
    tool.name,
    pushOpenAiLog,
    setToolData,
    updateOpenaiObject,
    setOpenInAppUrl,
  ]);

  useIframeAutoHeight({
    iframeRef,
    containerRef,
    enabled: Boolean(html) && !isFullscreen,
    onHeightChange: setContentHeight,
    documentKey: html,
  });

  const mounted = useIframeMounted({ iframeRef, documentKey: html });

  useEffect(() => {
    const win = iframeRef.current?.contentWindow as
      | (Window & { openai?: AppsSdkContext })
      | null;
    if (!win?.openai) {
      return;
    }
    win.openai.theme = theme;
    updateOpenaiObject(tool.name, "theme", theme);
  }, [theme, tool.name, updateOpenaiObject]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden bg-background transition-[width,background-color] duration-150 ease-out",
        isFullscreen
          ? "h-full w-full"
          : "mx-auto rounded-2xl border border-border shadow-md",
      )}
      style={{
        width: isFullscreen ? undefined : width,
        height: isFullscreen
          ? "100%"
          : contentHeight != null
            ? `${isPip ? Math.min(contentHeight, PIP_MAX_HEIGHT_PX) : contentHeight}px`
            : "auto",
        opacity: mounted ? 1 : 0,
        backgroundColor: theme === "dark" ? VIEW_DARK_BG : undefined,
      }}
    >
      <iframe
        ref={iframeRef}
        src="about:blank"
        style={{
          width: "100%",
          height: isFullscreen
            ? "100%"
            : contentHeight != null
              ? `${isPip ? Math.min(contentHeight, PIP_MAX_HEIGHT_PX) : contentHeight}px`
              : "100%",
          border: "none",
          display: "block",
        }}
        sandbox="allow-scripts allow-same-origin allow-forms"
        title="html-preview"
      />
    </div>
  );
};
