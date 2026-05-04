import { Suspense } from "react";

import { useSelectedToolOrNull } from "@/lib/mcp/index.js";
import { useCallToolResult } from "@/lib/store.js";
import { ToolPanelHeader } from "./tool-panel-header.js";
import { Widget } from "./widget/index.js";

const Placeholder = ({ text }: { text: string }) => (
  <div className="flex h-full items-center justify-center">
    <p className="text-xs text-muted-foreground">{text}</p>
  </div>
);

export const ToolPanel = () => {
  const tool = useSelectedToolOrNull();
  const data = useCallToolResult(tool?.name ?? "");
  const templateUri = tool?._meta?.["openai/outputTemplate"] as
    | string
    | undefined;
  const hasResult = Boolean(tool && data?.response);
  const hasView = Boolean(templateUri);

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden preview-region">
      {hasResult ? (
        hasView ? (
          <>
            <ToolPanelHeader />
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto py-3">
              <Suspense fallback={<Placeholder text="Loading widget…" />}>
                <Widget />
              </Suspense>
            </div>
          </>
        ) : (
          <Placeholder text="No view template" />
        )
      ) : (
        <Placeholder text="Choose a tool from the sidebar to begin" />
      )}
    </div>
  );
};
