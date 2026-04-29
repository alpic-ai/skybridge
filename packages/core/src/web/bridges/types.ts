import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { useSyncExternalStore } from "react";
import type { ViewHostType } from "../../server/index.js";

export type SkybridgeProperties = {
  hostType: ViewHostType;
  serverUrl: string;
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
export type RequestDisplayMode = Exclude<DisplayMode, "modal">;

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
  display: {
    mode: DisplayMode;
    params?: Record<string, unknown>;
  };
  viewState: Record<string, unknown> | null;
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

export type ViewState = Record<string, unknown>;

export type SetViewStateAction =
  | ViewState
  | ((prevState: ViewState | null) => ViewState);

export type FileMetadata = {
  fileId: string;
  fileName?: string;
  mimeType?: string;
};

export type UploadFileOptions = { library?: boolean };

export type RequestModalOptions = {
  title?: string;
  params?: Record<string, unknown>;
  template?: string;
  anchor?: { top?: number; left?: number; width?: number; height?: number };
};

export type OpenExternalOptions = {
  redirectUrl?: false;
};

export interface Adaptor {
  getHostContextStore<K extends keyof HostContext>(key: K): HostContextStore<K>;
  callTool<
    ToolArgs extends CallToolArgs = null,
    ToolResponse extends CallToolResponse = CallToolResponse,
  >(name: string, args: ToolArgs): Promise<ToolResponse>;
  requestDisplayMode(mode: RequestDisplayMode): Promise<{
    mode: RequestDisplayMode;
  }>;
  sendFollowUpMessage(prompt: string): Promise<void>;
  openExternal(href: string, options?: OpenExternalOptions): void;
  setViewState(stateOrUpdater: SetViewStateAction): Promise<void>;
  uploadFile(file: File, options?: UploadFileOptions): Promise<FileMetadata>;
  getFileDownloadUrl(file: FileMetadata): Promise<{ downloadUrl: string }>;
  selectFiles(): Promise<FileMetadata[]>;
  openModal(options: RequestModalOptions): void;
  setOpenInAppUrl(href: string): Promise<void>;
}
