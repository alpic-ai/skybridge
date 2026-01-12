import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { useSyncExternalStore } from "react";

export type CallToolArgs = Record<string, unknown> | null;

export type CallToolResponse = {
  content: CallToolResult["content"];
  structuredContent: NonNullable<CallToolResult["structuredContent"]>;
  isError: NonNullable<CallToolResult["isError"]>;
  result: string;
  _meta?: CallToolResult["_meta"];
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
  widgetState: Record<string, unknown> | null;
}

export type Subscribe = Parameters<typeof useSyncExternalStore>[0];

export interface Bridge<Context> {
  subscribe(key: keyof Context): Subscribe;
  subscribe(keys: readonly (keyof Context)[]): Subscribe;
  getSnapshot<K extends keyof Context>(key: K): Context[K] | undefined;
}

export type ExternalStore<K extends keyof BridgeInterface> = {
  subscribe: Subscribe;
  getSnapshot: () => BridgeInterface[K];
};

export interface Adaptor {
  getExternalStore<K extends keyof BridgeInterface>(key: K): ExternalStore<K>;
  callTool<
    ToolArgs extends CallToolArgs = null,
    ToolResponse extends CallToolResponse = CallToolResponse,
  >(name: string, args: ToolArgs): Promise<ToolResponse>;
  requestDisplayMode(mode: DisplayMode): Promise<{
    mode: DisplayMode;
  }>;
  sendFollowUpMessage(prompt: string): Promise<void>;
  openExternal(href: string): void;
  setWidgetState(state: Record<string, unknown>): Promise<void>;
}
