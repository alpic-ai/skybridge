import { CopyButton } from "@/lib/copy.js";
import { useSelectedToolOrNull } from "@/lib/mcp/index.js";
import { useCallToolResult } from "@/lib/store.js";
import { cn, formatBytes } from "@/lib/utils.js";
import { JsonSyntaxBlock } from "./json-syntax-block.js";

interface ToolPanelHeaderProps {
  expanded: boolean;
  onToggle: () => void;
}

export const ToolPanelHeader = ({
  expanded,
  onToggle,
}: ToolPanelHeaderProps) => {
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
    <button
      type="button"
      aria-expanded={expanded}
      onClick={onToggle}
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
  );
};

export const ToolPanelOutputContent = () => {
  const tool = useSelectedToolOrNull();
  const data = useCallToolResult(tool?.name ?? "");

  if (!tool || !data?.response) {
    return null;
  }

  const { response, openaiObject } = data;
  const responseJson = JSON.stringify(response, null, 2);
  const widgetStateJson = JSON.stringify(
    openaiObject?.widgetState ?? null,
    null,
    2,
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-row overflow-hidden bg-light-gray">
      <section className="relative min-h-0 min-w-0 flex-1 overflow-auto p-3">
        <CopyButton
          value={responseJson}
          label="Copy tool output"
          className="absolute right-2 top-2 z-10"
        />
        <JsonSyntaxBlock code={responseJson} />
      </section>
      <section className="relative min-h-0 min-w-0 flex-1 overflow-auto border-l border-border p-3">
        <CopyButton
          value={widgetStateJson}
          label="Copy view state"
          className="absolute right-2 top-2 z-10"
        />
        <JsonSyntaxBlock code={widgetStateJson} />
      </section>
    </div>
  );
};
