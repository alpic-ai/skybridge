import { useLocalStorageState } from "ahooks";
import { AnimatePresence, motion } from "framer-motion";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";

import { useSelectedToolOrNull } from "@/lib/mcp/index.js";
import { useCallToolResult } from "@/lib/store.js";
import { cn } from "@/lib/utils.js";
import { devtoolsJsonPrismTheme } from "./json-syntax-theme.js";

SyntaxHighlighter.registerLanguage("json", json);

const syntaxCustomStyle = {
  margin: 0,
  padding: 0,
  background: "transparent",
  fontSize: "0.75rem",
} as const;

function JsonSyntaxBlock({ code }: { code: string }) {
  return (
    <SyntaxHighlighter
      language="json"
      style={devtoolsJsonPrismTheme}
      customStyle={syntaxCustomStyle}
      codeTagProps={{ className: "font-mono whitespace-pre" }}
      showLineNumbers={false}
      wrapLongLines
    >
      {code}
    </SyntaxHighlighter>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes}b`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)}kb`;
  }
  const mb = kb / 1024;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)}mb`;
}

export const ToolPanelHeader = () => {
  const [expanded, setExpanded] = useLocalStorageState(
    "devtools-tool-panel-header-expanded",
    { defaultValue: false },
  );
  const tool = useSelectedToolOrNull();
  const data = useCallToolResult(tool?.name ?? "");

  if (!tool || !data?.response) {
    return null;
  }

  const { response, openaiObject, durationMs } = data;
  const responseJson = JSON.stringify(response, null, 2);
  const widgetStateJson = JSON.stringify(
    openaiObject?.widgetState ?? null,
    null,
    2,
  );

  const sizeBytes = new TextEncoder().encode(responseJson).length;
  const viewStateTokenCount = Math.max(
    1,
    Math.round(widgetStateJson.length / 4),
  );
  const isError = response.isError === true;

  return (
    <>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex h-9 w-full shrink-0 cursor-pointer items-center border-border bg-white text-left outline-none hover:bg-light-gray focus-visible:ring-1",
          expanded ? "border-b" : "border-b-2",
        )}
      >
        <div className="text-sm text-muted-foreground flex-1 border-r border-dashed border-light-gray-foreground/40 px-3 h-full flex items-center">
          <div className="font-medium">Tool output</div>
          <div className="text-xs text-light-gray-foreground flex items-center ml-auto gap-2 font-mono">
            <span className={isError ? "text-destructive" : "text-success"}>
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
        <div className="text-sm text-muted-foreground flex-1 px-3 h-full flex items-center">
          <div className="font-medium">View state</div>
          <div className="text-xs text-light-gray-foreground flex items-center ml-auto gap-2 font-mono">
            <span>
              {viewStateTokenCount} token{viewStateTokenCount > 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </button>
      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            key="tool-panel-expanded"
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{
              duration: 0.15,
              ease: [0.4, 0, 0.2, 1],
            }}
            style={{ minHeight: "10%", maxHeight: "40%" }}
            className="flex w-full shrink-0 flex-row overflow-hidden border-b-2 border-border bg-light-gray"
          >
            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-auto p-3">
              <JsonSyntaxBlock code={responseJson} />
            </div>
            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-auto border-l border-border p-3">
              <JsonSyntaxBlock code={widgetStateJson} />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
};
