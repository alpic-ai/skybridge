import { useEffect, useRef, useState } from "react";
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
import { useSyncOpenaiLocale } from "./use-sync-openai-locale.js";
import { useSyncOpenaiTheme } from "./use-sync-openai-theme.js";

const MOBILE_WIDTH_PX = 345;
const DESKTOP_WIDTH_PX = 770;
const PIP_MAX_HEIGHT_PX = 420;

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
  // Mobile preview in fullscreen keeps the inline-mobile layout (centered 345px
  // widget with body-driven height) on top of the fullscreen overlay.
  const isFullscreenDesktop = isFullscreen && !isMobile;
  const width = isFullscreenDesktop
    ? "100%"
    : `${isMobile ? MOBILE_WIDTH_PX : DESKTOP_WIDTH_PX}px`;
  const theme = useInspectorPreferencesStore((s) => s.theme);
  const locale = useInspectorPreferencesStore((s) => s.locale);

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
    enabled: Boolean(html) && !isFullscreenDesktop,
    onHeightChange: setContentHeight,
    documentKey: html,
  });

  const mounted = useIframeMounted({ iframeRef, documentKey: html });

  useSyncOpenaiTheme({
    iframeRef,
    toolName: tool.name,
    theme,
    updateOpenaiObject,
  });

  useSyncOpenaiLocale({
    iframeRef,
    toolName: tool.name,
    locale,
    updateOpenaiObject,
  });

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative transition-[width] duration-150 ease-out",
        isFullscreenDesktop ? "h-full w-full bg-background" : "mx-auto",
      )}
      style={{
        width: isFullscreenDesktop ? undefined : width,
        height: isFullscreenDesktop
          ? "100%"
          : contentHeight != null
            ? `${isPip ? Math.min(contentHeight, PIP_MAX_HEIGHT_PX) : contentHeight}px`
            : "auto",
        opacity: mounted ? 1 : 0,
      }}
    >
      <iframe
        ref={iframeRef}
        src="about:blank"
        style={{
          width: "100%",
          height: isFullscreenDesktop
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
