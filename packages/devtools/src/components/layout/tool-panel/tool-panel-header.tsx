import {
  getToolOutputTokenCount,
  getViewStateTokenCount,
  TOOL_OUTPUT_WARNING_TOKENS,
  VIEW_STATE_WARNING_TOKENS,
} from "@/lib/context-warnings.js";
import { CopyButton } from "@/lib/copy.js";
import { useSelectedToolOrNull } from "@/lib/mcp/index.js";
import { useCallToolResult } from "@/lib/store.js";
import { cn, formatBytes } from "@/lib/utils.js";
import { ContextWarningAlert, ContextWarningBadge } from "./context-warning.js";
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

  const sizeBytes = new TextEncoder().encode(responseJson).length;
  const toolOutputTokenCount = getToolOutputTokenCount(response);
  const viewStateTokenCount = getViewStateTokenCount(openaiObject?.widgetState);
  const hasToolOutputWarning =
    toolOutputTokenCount >= TOOL_OUTPUT_WARNING_TOKENS;
  const hasViewStateWarning = viewStateTokenCount >= VIEW_STATE_WARNING_TOKENS;
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
        <div className="flex items-center gap-2 font-medium">
          Tool output
          {hasToolOutputWarning && <ContextWarningBadge kind="tool-output" />}
        </div>
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
        <div className="flex items-center gap-2 font-medium">
          View state
          {hasViewStateWarning && <ContextWarningBadge kind="view-state" />}
        </div>
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

  const toolOutputTokenCount = getToolOutputTokenCount(response);
  const viewStateTokenCount = getViewStateTokenCount(openaiObject?.widgetState);
  const hasToolOutputWarning =
    toolOutputTokenCount >= TOOL_OUTPUT_WARNING_TOKENS;
  const hasViewStateWarning = viewStateTokenCount >= VIEW_STATE_WARNING_TOKENS;

  return (
    <div className="flex h-full min-h-0 w-full flex-row overflow-hidden bg-light-gray">
      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {hasToolOutputWarning && (
          <ContextWarningAlert
            kind="tool-output"
            tokenCount={toolOutputTokenCount}
          />
        )}
        <div className="relative min-h-0 flex-1 overflow-auto p-3">
          <CopyButton
            value={responseJson}
            label="Copy tool output"
            className="absolute right-2 top-2 z-10"
          />
          <JsonSyntaxBlock code={responseJson} />
        </div>
      </section>
      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-l border-border">
        {hasViewStateWarning && (
          <ContextWarningAlert
            kind="view-state"
            tokenCount={viewStateTokenCount}
          />
        )}
        <div className="relative min-h-0 flex-1 overflow-auto p-3">
          <CopyButton
            value={widgetStateJson}
            label="Copy view state"
            className="absolute right-2 top-2 z-10"
          />
          <JsonSyntaxBlock code={widgetStateJson} />
        </div>
      </section>
    </div>
  );
};
