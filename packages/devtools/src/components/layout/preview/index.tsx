import { Suspense } from "react";
import { useInspectorPreferencesStore } from "@/lib/inspector-preferences-store.js";
import { useSelectedToolOrNull } from "@/lib/mcp/index.js";
import { useCallToolResult } from "@/lib/store.js";
import { ToolPanelToolbar } from "../tool-panel/tool-panel-toolbar.js";
import { View } from "../tool-panel/view/index.js";
import { ChatgptShell } from "./chatgpt-shell.js";
import { ClaudeShell } from "./claude-shell.js";

export const Preview = () => {
  const tool = useSelectedToolOrNull();
  const data = useCallToolResult(tool?.name ?? "");
  const previewClient = useInspectorPreferencesStore((s) => s.previewClient);
  const templateUri = (tool?._meta?.ui as { resourceUri?: string } | undefined)
    ?.resourceUri;
  const hasWidget = Boolean(tool && data?.response && templateUri);
  const Shell = previewClient === "claude" ? ClaudeShell : ChatgptShell;

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex h-11 shrink-0 items-center gap-3 bg-primary px-3 text-primary-foreground">
        <span className="font-medium text-xs">Preview mode</span>
        <div className="min-w-0 flex-1">
          <ToolPanelToolbar variant="preview" />
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <Shell>
          {hasWidget ? (
            <Suspense fallback={null}>
              <View />
            </Suspense>
          ) : null}
        </Shell>
      </div>
    </div>
  );
};
