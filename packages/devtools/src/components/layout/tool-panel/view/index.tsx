import { useEffect, useRef, useState } from "react";
import mcpClient, {
  useSelectedTool,
  useSuspenseResource,
} from "@/lib/mcp/index.js";
import { useCallToolResult, useStore } from "@/lib/store.js";
import { asString, injectWaitForOpenai } from "@/lib/utils.js";
import { useIframeAutoHeight } from "../../../../hooks/use-iframe-auto-height.js";
import { createAndInjectOpenAi } from "./create-openai-mock.js";

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
    enabled: Boolean(html),
    onHeightChange: setContentHeight,
  });

  return (
    <div
      ref={containerRef}
      className="relative mx-auto overflow-hidden rounded-2xl border border-border bg-background shadow-md"
      style={{
        width: "770px",
        height: contentHeight != null ? `${contentHeight}px` : "auto",
      }}
    >
      <iframe
        ref={iframeRef}
        src="about:blank"
        style={{
          width: "100%",
          height: contentHeight != null ? `${contentHeight}px` : "100%",
          border: "none",
          display: "block",
        }}
        sandbox="allow-scripts allow-same-origin allow-forms"
        title="html-preview"
      />
    </div>
  );
};
