import { useLocalStorageState } from "ahooks";
import { AnimatePresence, motion } from "framer-motion";
import { PrismLight } from "react-syntax-highlighter";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";

import { useSelectedToolOrNull } from "@/lib/mcp/index.js";
import { useCallToolResult } from "@/lib/store.js";
import { cn, formatBytes } from "@/lib/utils.js";
import { devtoolsJsonPrismTheme } from "./json-syntax-theme.js";

PrismLight.registerLanguage("json", json);

function JsonSyntaxBlock({ code }: { code: string }) {
  return (
    <PrismLight
      language="json"
      style={devtoolsJsonPrismTheme}
      customStyle={{
        margin: 0,
        padding: 0,
        background: "transparent",
        fontSize: "0.75rem",
      }}
      codeTagProps={{ className: "font-mono whitespace-pre" }}
      showLineNumbers={false}
      wrapLongLines
    >
      {code}
    </PrismLight>
  );
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
            style={{ maxHeight: "40%" }}
            className="flex w-full shrink-0 flex-row overflow-hidden border-b-2 border-border bg-light-gray"
          >
            <section className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-auto p-3">
              <JsonSyntaxBlock code={responseJson} />
            </section>
            <section className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-auto border-l border-border p-3">
              <JsonSyntaxBlock code={widgetStateJson} />
            </section>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
};
