import { Braces, FileJson, Logs, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils.js";
import { LogsDrawer } from "./logs-drawer.js";
import {
  ToolPanelToolOutputContent,
  ToolPanelViewStateContent,
} from "./tool-panel-header.js";

type InspectorTab = "output" | "state" | "logs";

const tabs: Array<{
  id: InspectorTab;
  label: string;
  icon: typeof Braces;
}> = [
  { id: "output", label: "Output", icon: FileJson },
  { id: "state", label: "State", icon: Braces },
  { id: "logs", label: "Logs", icon: Logs },
];

export const FullscreenInspector = ({ onClose }: { onClose: () => void }) => {
  const [activeTab, setActiveTab] = useState<InspectorTab>("output");

  return (
    <aside
      aria-label="DevTools inspector"
      className="absolute bottom-4 right-4 top-16 z-[60] flex w-96 max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-lg border border-border bg-background shadow-xl"
    >
      <div className="flex h-10 shrink-0 items-center border-b border-border px-2">
        <div
          role="tablist"
          aria-label="Inspector panels"
          className="flex gap-1"
        >
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              id={`fullscreen-inspector-${id}-tab`}
              type="button"
              role="tab"
              aria-controls={`fullscreen-inspector-${id}-panel`}
              aria-selected={activeTab === id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                activeTab === id
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-light-gray hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-label="Close DevTools inspector"
          onClick={onClose}
          className="ml-auto inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-light-gray hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <div
        id={`fullscreen-inspector-${activeTab}-panel`}
        role="tabpanel"
        aria-labelledby={`fullscreen-inspector-${activeTab}-tab`}
        className="min-h-0 flex-1 overflow-hidden bg-light-gray"
      >
        {activeTab === "output" ? (
          <ToolPanelToolOutputContent />
        ) : activeTab === "state" ? (
          <ToolPanelViewStateContent />
        ) : (
          <LogsDrawer />
        )}
      </div>
    </aside>
  );
};
