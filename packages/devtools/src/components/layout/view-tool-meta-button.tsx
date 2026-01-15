import ReactJsonView from "@microlink/react-json-view";
import { InfoIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button.js";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog.js";
import { useSelectedTool } from "@/lib/mcp/index.js";

export const ViewToolMetaButton = () => {
  const tool = useSelectedTool();
  const [metaDialogOpen, setMetaDialogOpen] = useState(false);
  const hasMeta = tool._meta && Object.keys(tool._meta).length > 0;

  if (!hasMeta) {
    return null;
  }

  return (
    <>
      <Button
        variant="ghost"
        size="default"
        onClick={() => setMetaDialogOpen(true)}
        aria-label="View tool metadata"
        title="View tool metadata"
      >
        <InfoIcon className="h-4 w-4" />
        Metadata
      </Button>
      <Dialog open={metaDialogOpen} onOpenChange={setMetaDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogTitle>Tool Metadata</DialogTitle>
          <div className="text-xs">
            <ReactJsonView
              src={tool._meta as Record<string, unknown>}
              name={null}
              quotesOnKeys={false}
              displayDataTypes={false}
              displayObjectSize={false}
              enableClipboard={false}
              theme="rjv-default"
              style={{
                fontSize: "0.75rem",
              }}
              collapsed={2}
              collapseStringsAfterLength={80}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
