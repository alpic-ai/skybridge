import { useCallback, useEffect, useRef } from "react";
import { useSelectedTool, useSuspenseResource } from "@/lib/mcp/index.js";
import { useCallToolResult, useStore } from "@/lib/store.js";
import { createAndInjectOpenAi } from "./create-openai-mock.js";
import { injectWaitForOpenai } from "./utils.js";

export const Widget = () => {
  const tool = useSelectedTool();
  const { openaiObject } = useCallToolResult(tool.name);
  const { data: resource } = useSuspenseResource(
    tool._meta?.["openai/outputTemplate"] as string | undefined,
  );
  const { setToolData, pushOpenAiLog, updateOpenaiObject } = useStore();
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

    iframe.contentDocument.open();
    iframe.contentDocument.write(injectWaitForOpenai(html));
    iframe.contentDocument.close();

    const doc = iframe.contentDocument;

    const resizeObserver = new ResizeObserver(() => {
      iframe.style.height = `${doc.documentElement.scrollHeight}px`;
    });

    resizeObserver.observe(doc.body);

    setToolData(tool.name, {
      openaiRef: iframeRef as React.RefObject<HTMLIFrameElement>,
    });
  }, [
    openaiObject,
    pushOpenAiLog,
    setToolData,
    updateOpenaiObject,
    tool.name,
    html,
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
      }}
    >
      <iframe
        ref={iframeRef}
        src="about:blank"
        onLoad={handleLoad}
        style={{
          width: "100%",
          border: "none",
          display: "block",
          maxHeight: "300px",
        }}
        sandbox="allow-scripts allow-same-origin"
        title="html-preview"
      />
    </div>
  );
};
