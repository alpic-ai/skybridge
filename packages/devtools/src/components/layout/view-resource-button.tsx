import ReactJsonView from "@microlink/react-json-view";
import { SearchIcon } from "lucide-react";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button.js";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog.js";
import { useSelectedTool, useSuspenseResource } from "@/lib/mcp/index.js";

function ViewResourceButtonContent({ resourceUri }: { resourceUri: string }) {
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);
  const { data: resource } = useSuspenseResource(resourceUri);

  if (!resource) {
    return null;
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setResourceDialogOpen(true)}
        aria-label="View resource"
        title="View resource"
      >
        <SearchIcon className="h-3 w-3" />
        Inspect Resource
      </Button>
      <Dialog open={resourceDialogOpen} onOpenChange={setResourceDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogTitle>Resource</DialogTitle>
          <div className="text-xs">
            <ReactJsonView
              src={resource.contents[0]}
              name={null}
              quotesOnKeys={false}
              displayDataTypes={false}
              displayObjectSize={false}
              enableClipboard={false}
              theme="rjv-default"
              style={{
                fontSize: "0.75rem",
              }}
              collapsed={4}
              collapseStringsAfterLength={80}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export const ViewResourceButton = () => {
  const tool = useSelectedTool();
  const resourceUri = tool._meta?.["openai/outputTemplate"] as
    | string
    | undefined;

  if (!resourceUri) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <ViewResourceButtonContent resourceUri={resourceUri} />
    </Suspense>
  );
};
