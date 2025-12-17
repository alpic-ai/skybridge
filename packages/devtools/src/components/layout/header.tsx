import { useServerInfo } from "@/lib/mcp";
import { useSelectedToolName } from "@/lib/nuqs";
import { ExternalLink } from "lucide-react";
import { Button } from "../ui/button";

export const Header = () => {
  const serverInfo = useServerInfo();
  const name = serverInfo?.name;
  const version = serverInfo?.version;
  const [, setSelectedTool] = useSelectedToolName();

  return (
    <div className="flex flex-col border-b border-border bg-background">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="font-semibold cursor-pointer"
            onClick={() => {
              setSelectedTool(null);
            }}
          >
            Skybridge
          </button>
          <span className="h-4 w-px bg-border" aria-hidden="true" />
          <div className="flex items-center gap-4 rounded-md border border-border bg-muted px-2 py-1">
            <span className="text-xs font-medium text-muted-foreground">
              {name}
            </span>
            <span className="text-xs text-muted-foreground">v{version}</span>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
            <span className="h-2 w-2 rounded-full bg-green-500 mr-1 inline-block"></span>
            Connected
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 gap-2">
            <a
              href="https://www.skybridge.tech/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              Learn more about Skybridge
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
};
