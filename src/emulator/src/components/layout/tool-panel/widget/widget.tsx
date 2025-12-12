import { useResource } from "@/lib/mcp";
import { useStore, useCallToolResult } from "@/lib/store";
import { useSelectedTool } from "@/lib/mcp";
import { useCallback, useEffect, useRef } from "react";
import { createAndInjectOpenAi } from "./create-openai-mock";

export const Widget = () => {
  const tool = useSelectedTool()!;
  const { openaiObject } = useCallToolResult(tool.name);
  const { data: resource } = useResource(
    tool._meta?.["ui/resourceUri"] as string | undefined,
  );
  const { setToolData, pushOpenAiLog, updateOpenaiObject } = useStore();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const content = resource?.contents[0];
  const text = content && "text" in content ? content.text : undefined;

  const handleLoad = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const iframeWindow = iframe.contentWindow as Window & {
      openai?: unknown;
    };
    if (!iframeWindow) {
      return;
    }

    createAndInjectOpenAi(
      iframeWindow,
      openaiObject!,
      (command, args) => {
        pushOpenAiLog(tool.name, { timestamp: Date.now(), command, args });
      },
      (key, value) => {
        updateOpenaiObject(tool.name, key, value);
      },
    );

    const doc = iframe.contentDocument!;

    const resizeObserver = new ResizeObserver(() => {
      const height = doc.documentElement.scrollHeight;
      iframe.style.height = height + "px";
    });

    resizeObserver.observe(doc.body);

    setToolData(tool.name, {
      openaiRef: iframeRef as React.RefObject<HTMLIFrameElement>,
    });
  }, [openaiObject, pushOpenAiLog, setToolData, updateOpenaiObject, tool.name]);

  useEffect(() => {
    const iframe = iframeRef.current;
    iframe?.addEventListener("load", handleLoad);

    return () => {
      iframe?.removeEventListener("load", handleLoad);
    };
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
        srcDoc={text as string}
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
