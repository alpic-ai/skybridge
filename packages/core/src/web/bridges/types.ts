import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { useSyncExternalStore } from "react";
import type { WidgetHostType } from "../../server/index.js";

export type SkybridgeProperties = {
  hostType: WidgetHostType;
};

declare global {
  interface Window {
    skybridge: SkybridgeProperties;
  }
}

export type CallToolArgs = Record<string, unknown> | null;

export type CallToolResponse = {
  content: CallToolResult["content"];
  structuredContent: NonNullable<CallToolResult["structuredContent"]>;
  isError: NonNullable<CallToolResult["isError"]>;
  result: string;
  meta?: CallToolResult["_meta"];
};

export type DisplayMode = "pip" | "inline" | "fullscreen" | "modal";

export type Theme = "light" | "dark";

export type DeviceType = "mobile" | "tablet" | "desktop" | "unknown";

export type SafeAreaInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type SafeArea = {
  insets: SafeAreaInsets;
};

export type UserAgent = {
  device: {
    type: DeviceType;
  };
  capabilities: {
    hover: boolean;
    touch: boolean;
  };
};

export interface HostContext {
  theme: Theme;
  locale: string;
  displayMode: DisplayMode;
  safeArea: SafeArea;
  maxHeight: number | undefined;
  userAgent: UserAgent;
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

export type HostContextStore<K extends keyof HostContext> = {
  subscribe: Subscribe;
  getSnapshot: () => HostContext[K];
};

export type WidgetState = Record<string, unknown>;

export type SetWidgetStateAction =
  | WidgetState
  | ((prevState: WidgetState | null) => WidgetState);

export type FileMetadata = { fileId: string };

export interface Adaptor {
  getHostContextStore<K extends keyof HostContext>(key: K): HostContextStore<K>;
  callTool<
    ToolArgs extends CallToolArgs = null,
    ToolResponse extends CallToolResponse = CallToolResponse,
  >(name: string, args: ToolArgs): Promise<ToolResponse>;
  requestDisplayMode(mode: DisplayMode): Promise<{
    mode: DisplayMode;
  }>;
  sendFollowUpMessage(prompt: string): Promise<void>;
  openExternal(href: string): void;
  setWidgetState(stateOrUpdater: SetWidgetStateAction): Promise<void>;
  useFiles(): {
    upload: (file: File) => Promise<FileMetadata>;
    getDownloadUrl: (file: FileMetadata) => Promise<{ downloadUrl: string }>;
  };
}
