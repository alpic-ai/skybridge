import { useEffect, useRef, useState } from "react";
import mcpClient, {
  useSelectedTool,
  useSuspenseResource,
} from "@/lib/mcp/index.js";
import { useCallToolResult, useStore } from "@/lib/store.js";
import { createAndInjectOpenAi } from "./create-openai-mock.js";
import { injectWaitForOpenai } from "./utils.js";

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
  const widgetDomainMeta = resourceEntry._meta?.["openai/widgetDomain"];
  const widgetDomain =
    typeof widgetDomainMeta === "string" ? widgetDomainMeta : undefined;

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow || !iframe.contentDocument) {
      return;
    }

    if (widgetDomain) {
      setOpenInAppUrl(tool.name, widgetDomain);
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

    let lastMeasured = 0;
    const measure = () => {
      const doc = iframe.contentDocument;
      if (!doc?.body) {
        return;
      }
      const parentEl = containerRef.current?.parentElement;
      const parentH = parentEl?.clientHeight ?? 0;
      // Before layout, the scroll parent can report 0 — do not clamp to 0 or we never commit height.
      const maxH = parentH > 0 ? parentH : Number.POSITIVE_INFINITY;
      const innerScroll = Math.max(
        doc.body.scrollHeight,
        doc.documentElement.scrollHeight,
      );
      const measured = Math.min(innerScroll, maxH);
      if (measured > 0 && measured !== lastMeasured) {
        lastMeasured = measured;
        setContentHeight(measured);
      }
    };

    const observer = new ResizeObserver(() => measure());
    observer.observe(iframe.contentDocument.body);
    observer.observe(iframe.contentDocument.documentElement);
    if (containerRef.current?.parentElement) {
      observer.observe(containerRef.current.parentElement);
    }
    measure();

    return () => {
      observer.disconnect();
    };
    // Store actions are stable Zustand refs; only primitives drive re-runs.
  }, [
    html,
    widgetDomain,
    tool.name,
    pushOpenAiLog,
    setToolData,
    updateOpenaiObject,
    setOpenInAppUrl,
  ]);

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
