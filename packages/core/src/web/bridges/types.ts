import type {
  SchemaOutput,
  ZodRawShapeCompat,
} from "@modelcontextprotocol/sdk/server/zod-compat.js";
import type {
  CallToolResult,
  EmbeddedResource,
  ResourceLink,
  ToolAnnotations,
} from "@modelcontextprotocol/sdk/types.js";
import type { useSyncExternalStore } from "react";
import type { ViewHostType } from "../../server/index.js";

/**
 * Globals injected on `window.skybridge` by the host. Tells the view which
 * runtime it's running under and where to reach the MCP server.
 */
export type SkybridgeProperties = {
  hostType: ViewHostType;
  serverUrl: string;
};

declare global {
  interface Window {
    skybridge: SkybridgeProperties;
  }
}

/** Arguments passed to a tool call. `null` for tools that take no input. */
export type CallToolArgs = Record<string, unknown> | null;

/**
 * Result of a tool call as surfaced to the view: MCP `content` blocks plus
 * the typed `structuredContent` and optional `meta`. `isError` is set when
 * the server marks the call as failed.
 */
export type CallToolResponse = {
  content: CallToolResult["content"];
  structuredContent: NonNullable<CallToolResult["structuredContent"]>;
  isError: NonNullable<CallToolResult["isError"]>;
  meta?: CallToolResult["_meta"];
};

/**
 * How the view is laid out by the host. `"modal"` is host-driven (see
 * {@link useRequestModal}); `"pip"`, `"inline"`, and `"fullscreen"` are
 * requestable via {@link useDisplayMode}.
 */
export type DisplayMode = "pip" | "inline" | "fullscreen" | "modal";
/** Subset of {@link DisplayMode} that the view can request from the host. */
export type RequestDisplayMode = Exclude<DisplayMode, "modal">;

/** Host theme. Mirror this in your view's styling for a native feel. */
export type Theme = "light" | "dark";

/** Coarse device class reported by the host. `"unknown"` when unavailable. */
export type DeviceType = "mobile" | "tablet" | "desktop" | "unknown";

/** Pixel insets the view should keep clear of (notches, home indicators, etc.). */
export type SafeAreaInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

/** Wrapper around {@link SafeAreaInsets} exposed via {@link useLayout}. */
export type SafeArea = {
  insets: SafeAreaInsets;
};

/** Device and input-capability hints exposed via {@link useUser}. */
export type UserAgent = {
  device: {
    type: DeviceType;
  };
  capabilities: {
    hover: boolean;
    touch: boolean;
  };
};

/**
 * Full snapshot of state the host exposes to the view. Most fields are
 * better accessed through their dedicated hooks (`useLayout`, `useUser`,
 * `useToolInfo`, etc.) — read this directly only for advanced cases.
 */
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

/** @internal `useSyncExternalStore` subscribe signature, re-exported for bridge implementations. */
export type Subscribe = Parameters<typeof useSyncExternalStore>[0];

/** @internal Bridge contract implemented by per-host bridge classes. */
export interface Bridge<Context> {
  subscribe(key: keyof Context): Subscribe;
  subscribe(keys: readonly (keyof Context)[]): Subscribe;
  getSnapshot<K extends keyof Context>(key: K): Context[K] | undefined;
}

/** @internal Per-key snapshot store backing {@link useHostContext}. */
export type HostContextStore<K extends keyof HostContext> = {
  subscribe: Subscribe;
  getSnapshot: () => HostContext[K];
};

/** Persisted view state shape (a plain object). See {@link useViewState}. */
export type ViewState = Record<string, unknown>;

/** Updater form accepted when writing to view state. */
export type SetViewStateAction =
  | ViewState
  | ((prevState: ViewState | null) => ViewState);

/** Reference to a host-managed file (returned by {@link useFiles}). */
export type FileMetadata = {
  fileId: string;
  fileName?: string;
  mimeType?: string;
};

/** Options for {@link useFiles}'s `upload`. `library: true` saves into the user's library when supported. */
export type UploadFileOptions = { library?: boolean };

/** Options for {@link useRequestModal}'s `open` call. */
export type RequestModalOptions = {
  title?: string;
  params?: Record<string, unknown>;
  template?: string;
  anchor?: { top?: number; left?: number; width?: number; height?: number };
};

/**
 * Options for {@link useOpenExternal}. Set `redirectUrl: false` to tell the
 * host not to append its `?redirectUrl=…` tracking query parameter when
 * opening allowlisted targets.
 */
export type OpenExternalOptions = {
  redirectUrl?: false;
};

/** Options for {@link useSendFollowUpMessage}. */
export type SendFollowUpMessageOptions = { scrollToBottom?: boolean };

/** Options for {@link useRequestSize}. Omit a dimension to leave it unchanged. */
export type RequestSizeOptions = {
  width?: number;
  height?: number;
};

export type DownloadParams = {
  contents: (EmbeddedResource | ResourceLink)[];
};

export type DownloadResult = {
  isError?: boolean;
};

/**
 * Args passed to a {@link ViewToolHandler}, inferred from the tool's
 * `inputSchema` (optionality preserved). Mirrors the server's `registerTool`.
 */
export type InferViewToolArgs<Shape extends ZodRawShapeCompat> = {
  [K in keyof Shape as undefined extends SchemaOutput<Shape[K]>
    ? never
    : K]: SchemaOutput<Shape[K]>;
} & {
  [K in keyof Shape as undefined extends SchemaOutput<Shape[K]>
    ? K
    : never]?: SchemaOutput<Shape[K]>;
};

/**
 * Declares a tool the view exposes to the host/model (the MCP Apps
 * "app-provided tools" feature). Mirrors the server-side `registerTool` config.
 * Namespace `name` (e.g. `chess_make_move`) to avoid clashing with server tools.
 */
export type ViewToolConfig<
  TInput extends ZodRawShapeCompat = ZodRawShapeCompat,
> = {
  name: string;
  title?: string;
  description?: string;
  inputSchema?: TInput;
  annotations?: ToolAnnotations;
};

/**
 * Value a {@link ViewToolHandler} returns — a standard MCP `CallToolResult`
 * (`content` blocks plus optional `structuredContent` / `isError` / `_meta`),
 * exactly as `ext-apps`' app tool callbacks return it.
 */
export type ViewToolResult = CallToolResult;

/** Handler run when the host calls a view tool. Receives validated, typed args. */
export type ViewToolHandler<
  TInput extends ZodRawShapeCompat = ZodRawShapeCompat,
> = (
  args: InferViewToolArgs<TInput>,
) => ViewToolResult | Promise<ViewToolResult>;

/** @internal Untyped handler signature stored by the adaptor/bridge after type erasure. */
export type AnyViewToolHandler = (
  args: Record<string, unknown>,
) => ViewToolResult | Promise<ViewToolResult>;

/**
 * @internal
 * Low-level interface every host bridge implements. End-user code should use
 * the React hooks (`useCallTool`, `useViewState`, `useFiles`, …) rather than
 * calling this directly.
 */
export interface Adaptor {
  getHostContextStore<K extends keyof HostContext>(key: K): HostContextStore<K>;
  callTool<
    ToolArgs extends CallToolArgs = null,
    ToolResponse extends CallToolResponse = CallToolResponse,
  >(name: string, args: ToolArgs): Promise<ToolResponse>;
  requestDisplayMode(mode: RequestDisplayMode): Promise<{
    mode: RequestDisplayMode;
  }>;
  requestClose(): Promise<void>;
  requestSize(size: RequestSizeOptions): Promise<void>;
  sendFollowUpMessage(
    prompt: string,
    options?: SendFollowUpMessageOptions,
  ): Promise<void>;
  openExternal(href: string, options?: OpenExternalOptions): void;
  download(params: DownloadParams): Promise<DownloadResult>;
  setViewState(stateOrUpdater: SetViewStateAction): Promise<void>;
  uploadFile(file: File, options?: UploadFileOptions): Promise<FileMetadata>;
  getFileDownloadUrl(file: FileMetadata): Promise<{ downloadUrl: string }>;
  selectFiles(): Promise<FileMetadata[]>;
  openModal(options: RequestModalOptions): void;
  setOpenInAppUrl(href: string): Promise<void>;
  registerViewTool(
    config: ViewToolConfig,
    handler: AnyViewToolHandler,
  ): () => void;
}
