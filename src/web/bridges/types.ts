import type { McpUiDisplayMode } from "@modelcontextprotocol/ext-apps";

export interface IBridge {
  requestDisplayMode({ mode }: { mode: McpUiDisplayMode }): Promise<{
    mode: McpUiDisplayMode;
  }>;
}
