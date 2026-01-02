import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export type CallToolArgs = Record<string, unknown> | null;

export type CallToolResponse = {
  content: CallToolResult["content"];
  structuredContent: NonNullable<CallToolResult["structuredContent"]>;
  isError: NonNullable<CallToolResult["isError"]>;
  result: string;
  meta: NonNullable<CallToolResult["_meta"]>;
};

export type Methods = {
  callTool<
    ToolArgs extends CallToolArgs = null,
    ToolResponse extends CallToolResponse = CallToolResponse,
  >(name: string, args: ToolArgs): Promise<ToolResponse>;
  requestDisplayMode(mode: DisplayMode): Promise<{
    mode: DisplayMode;
  }>;
  sendFollowUpMessage(prompt: string): Promise<void>;
};

export type DisplayMode = "pip" | "inline" | "fullscreen" | "modal";

export type DeviceType = "mobile" | "tablet" | "desktop" | "unknown";
export interface BridgeInterface {
  theme: "light" | "dark";
  locale: string;
  displayMode: DisplayMode;
  safeArea: {
    insets: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
  };
  maxHeight: number;
  userAgent: {
    device: {
      type: DeviceType;
    };
    capabilities: {
      hover: boolean;
      touch: boolean;
    };
  };
  toolInput: Record<string, unknown> | null;
  toolOutput: Record<string, unknown> | null;
  toolResponseMetadata: Record<string, unknown> | null;
}
