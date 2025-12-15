import { useResource, useSelectedTool } from "@/lib/mcp";
import { useCallToolResult, useStore } from "@/lib/store";
import { useCallback, useRef } from "react";
import { createAndInjectOpenAi } from "./create-openai-mock";
import { injectWaitForOpenai } from "./utils";

export const Widget = () => {
  const tool = useSelectedTool();
  const { openaiObject } = useCallToolResult(tool.name);
  const { data: resource } = useResource(
    tool._meta?.["ui/resourceUri"] as string | undefined,
  );
  const { setToolData, pushOpenAiLog, updateOpenaiObject } = useStore();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasLoadedRef = useRef(false);

  const content = resource?.contents[0];
  const text = content && "text" in content ? content.text : undefined;

  const handleLoad = useCallback(() => {
    if (hasLoadedRef.current) return;

    const iframe = iframeRef.current;
    if (!iframe?.contentWindow || !iframe?.contentDocument) return;

    hasLoadedRef.current = true;

    createAndInjectOpenAi(
      iframe.contentWindow,
      openaiObject,
      (command, args) => {
        pushOpenAiLog(tool.name, { timestamp: Date.now(), command, args });
      },
      (key, value) => {
        updateOpenaiObject(tool.name, key, value);
      },
    );

    const doc = iframe.contentDocument;

    const resizeObserver = new ResizeObserver(() => {
      iframe.style.height = `${doc.documentElement.scrollHeight}px`;
    });

    resizeObserver.observe(doc.body);

    setToolData(tool.name, {
      openaiRef: iframeRef as React.RefObject<HTMLIFrameElement>,
    });
  }, [openaiObject, pushOpenAiLog, setToolData, updateOpenaiObject, tool.name]);

  return (
    <div
      ref={containerRef}
      className="relative overflow-auto"
      style={{
        width: "100%",
      }}
    >
      <iframe
        ref={iframeRef}
        srcDoc={injectWaitForOpenai(text as string)}
        onLoad={handleLoad}
        style={{
          width: "100%",
          border: "none",
          display: "block",
        }}
        sandbox="allow-scripts allow-same-origin"
        title="html-preview"
      />
    </div>
  );
};
