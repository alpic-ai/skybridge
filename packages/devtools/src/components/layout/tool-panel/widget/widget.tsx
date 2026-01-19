import { useCallback, useEffect, useRef } from "react";
import mcpClient, {
  useSelectedTool,
  useSuspenseResource,
} from "@/lib/mcp/index.js";
import { useCallToolResult, useStore } from "@/lib/store.js";
import { createAndInjectOpenAi } from "./create-openai-mock.js";
import { injectWaitForOpenai } from "./utils.js";

export const Widget = () => {
  const tool = useSelectedTool();
  const toolResult = useCallToolResult(tool.name);
  const { openaiObject, openInAppUrl } = toolResult ?? {};
  const { data: resource } = useSuspenseResource(
    tool._meta?.["openai/outputTemplate"] as string | undefined,
  );
  const { setToolData, pushOpenAiLog, updateOpenaiObject, setOpenInAppUrl } =
    useStore();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasLoadedRef = useRef(false);

  const html = (resource.contents[0] as { text: string }).text;

  const handleLoad = useCallback(() => {
    if (hasLoadedRef.current) {
      return;
    }

    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow || !iframe.contentDocument) {
      return;
    }

    hasLoadedRef.current = true;

    // Hydrate openInAppUrl from resource metadata if available and not already set
    if (!openInAppUrl) {
      const widgetDomain = (resource._meta as Record<string, unknown>)?.[
        "openai/widgetDomain"
      ];
      if (widgetDomain && typeof widgetDomain === "string") {
        setOpenInAppUrl(tool.name, widgetDomain);
      }
    }

    createAndInjectOpenAi(
      iframe.contentWindow,
      openaiObject,
      (command, args, type = "default") => {
        pushOpenAiLog(tool.name, {
          timestamp: Date.now(),
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
    openaiObject,
    openInAppUrl,
    pushOpenAiLog,
    setToolData,
    updateOpenaiObject,
    setOpenInAppUrl,
    tool.name,
    html,
    resource,
  ]);

  useEffect(() => {
    handleLoad();
  }, [handleLoad]);

  return (
    <div
      ref={containerRef}
      className="relative overflow-auto"
      style={{
        width: "100%",
        height: "100%",
      }}
    >
      <iframe
        ref={iframeRef}
        src="about:blank"
        onLoad={handleLoad}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          display: "block",
        }}
        sandbox="allow-scripts allow-same-origin"
        title="html-preview"
      />
    </div>
  );
};
