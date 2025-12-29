import type { McpUiDisplayMode } from "@modelcontextprotocol/ext-apps";

export interface IBridge {
  requestDisplayMode({ mode }: { mode: McpUiDisplayMode }): Promise<{
    mode: McpUiDisplayMode;
  }>;
}

export interface BridgeInterface {
  theme: "light" | "dark";
  locale: string;
  displayMode: "pip" | "inline" | "fullscreen" | "modal";
  safeArea: {
    insets: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
  };
  maxHeight: number;
}
