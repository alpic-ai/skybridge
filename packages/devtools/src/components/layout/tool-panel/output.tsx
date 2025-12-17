import ReactJsonView from "@microlink/react-json-view";
import { CircleAlertIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSelectedTool } from "@/lib/mcp";
import { useCallToolResult } from "@/lib/store";

export const Output = () => {
  const tool = useSelectedTool();
  const result = useCallToolResult(tool.name);

  if (!result) return null;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-card">
      <div className="p-4 overflow-auto">
        {result.response ? (
          result.response.isError ? (
            <Alert variant="error">
              <CircleAlertIcon />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {result.response.content.map((c) => c.text).join("\n")}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="text-xs">
              <ReactJsonView
                src={result.response ?? {}}
                name={null}
                quotesOnKeys={false}
                displayDataTypes={false}
                displayObjectSize={false}
                enableClipboard={false}
                theme="rjv-default"
                style={{
                  fontSize: "0.75rem",
                }}
                collapsed={3}
                collapseStringsAfterLength={80}
              />
            </div>
          )
        ) : null}
      </div>
    </div>
  );
};
