import ReactJsonView from "@microlink/react-json-view";
import { useSuspenseResource } from "@/lib/mcp/index.js";

export function ResourceTabContent({ resourceUri }: { resourceUri: string }) {
  const { data: resource } = useSuspenseResource(resourceUri);

  if (!resource) {
    return null;
  }

  return (
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
  );
}
