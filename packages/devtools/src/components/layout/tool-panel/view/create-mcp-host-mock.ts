import type { CallToolResponse } from "skybridge/web";
import { useInspectorPreferencesStore } from "@/lib/inspector-preferences-store.js";

type PostFn = (msg: unknown) => void;

type HostContext = {
  theme?: string;
  locale?: string;
  displayMode?: string;
  safeAreaInsets?: { top: number; right: number; bottom: number; left: number };
  platform?: string;
  deviceCapabilities?: { hover?: boolean; touch?: boolean };
  [key: string]: unknown;
};

function postToIframe(iframe: HTMLIFrameElement, msg: unknown) {
  iframe.contentWindow?.postMessage(msg, "*");
}

function respond(post: PostFn, id: number, result: unknown) {
  post({ jsonrpc: "2.0", id, result });
}

function respondError(post: PostFn, id: number, code: number, message: string) {
  post({ jsonrpc: "2.0", id, error: { code, message } });
}

function buildHostContext(): HostContext {
  const preferences = useInspectorPreferencesStore.getState();
  return {
    theme: preferences.theme,
    locale: preferences.locale,
    displayMode: preferences.displayMode,
    safeAreaInsets: preferences.safeArea?.insets ?? {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
    platform:
      preferences.userAgent?.device?.type === "mobile" ? "mobile" : "web",
    deviceCapabilities: preferences.userAgent?.capabilities,
  };
}

export type McpHostMockCleanup = () => void;

export type ToolDataSnapshot = {
  toolInput?: Record<string, unknown> | null;
  toolOutput?: Record<string, unknown> | null;
  toolResponseMetadata?: Record<string, unknown> | null;
};

export function createMcpHostMock(
  iframe: HTMLIFrameElement,
  callToolFn: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<CallToolResponse>,
  log: (
    command: string,
    args: Record<string, unknown>,
    type?: "default" | "response",
  ) => void,
  getCurrentToolData: () => ToolDataSnapshot,
): McpHostMockCleanup {
  const post = (msg: unknown) => postToIframe(iframe, msg);

  const handleMessage = async (event: MessageEvent) => {
    if (event.source !== iframe.contentWindow) {
      return;
    }
    const msg = event.data as {
      jsonrpc?: string;
      id?: number;
      method?: string;
      params?: Record<string, unknown>;
    };
    if (msg?.jsonrpc !== "2.0") {
      return;
    }

    const { id, method, params } = msg;

    // Notifications have no id — no response needed.
    if (method === "ui/notifications/size-changed") {
      return;
    }
    if (method === "ui/notifications/request-teardown") {
      return;
    }

    if (id === undefined) {
      return;
    }

    switch (method) {
      case "ui/initialize": {
        respond(post, id, {
          protocolVersion: "2025-06-18",
          hostInfo: { name: "skybridge-devtools", version: "0.0.1" },
          hostCapabilities: {
            openLinks: {},
            serverTools: {},
          },
          hostContext: buildHostContext(),
        });
        // Push current tool state immediately after initialize so the widget
        // sees toolInput/toolOutput without waiting for a separate update.
        const snapshot = getCurrentToolData();
        if (snapshot.toolInput != null) {
          post({
            jsonrpc: "2.0",
            method: "ui/notifications/tool-input",
            params: { arguments: snapshot.toolInput },
          });
        }
        if (
          snapshot.toolOutput != null ||
          snapshot.toolResponseMetadata != null
        ) {
          post({
            jsonrpc: "2.0",
            method: "ui/notifications/tool-result",
            params: {
              content: [],
              structuredContent: snapshot.toolOutput ?? {},
              isError: false,
              _meta: snapshot.toolResponseMetadata ?? {},
            },
          });
        }
        break;
      }
      case "ui/update-model-context": {
        log(
          "mcp:updateModelContext",
          (params as Record<string, unknown>) ?? {},
        );
        respond(post, id, {});
        break;
      }
      case "ui/request-display-mode": {
        const mode = (params as { mode?: string })?.mode ?? "inline";
        useInspectorPreferencesStore
          .getState()
          .setPreference(
            "displayMode",
            mode as "inline" | "fullscreen" | "pip",
          );
        respond(post, id, { mode });
        break;
      }
      case "ui/open-link": {
        const url = (params as { url?: string })?.url;
        if (url) {
          window.open(url, "_blank", "noopener,noreferrer");
        }
        respond(post, id, {});
        break;
      }
      case "ui/download-file": {
        respondError(
          post,
          id,
          -32603,
          "downloadFile capability disabled in devtools",
        );
        break;
      }
      case "tools/call": {
        const name = (params as { name?: string })?.name ?? "";
        const args =
          (params as { arguments?: Record<string, unknown> })?.arguments ?? {};
        log("mcp:tools/call", { name, args });
        try {
          const result = await callToolFn(name, args);
          log(
            "mcp:tools/call response",
            result as unknown as Record<string, unknown>,
            "response",
          );
          respond(post, id, result);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          respondError(post, id, -32603, message);
        }
        break;
      }
      default: {
        if (id !== undefined) {
          respondError(post, id, -32601, `Method not found: ${method}`);
        }
      }
    }
  };

  window.addEventListener("message", handleMessage);

  // Subscribe to inspector preferences changes and push host-context-changed.
  const unsubscribePreferences = useInspectorPreferencesStore.subscribe(
    (preferences, previous) => {
      const changed: HostContext = {};
      if (preferences.theme !== previous.theme) {
        changed.theme = preferences.theme;
      }
      if (preferences.locale !== previous.locale) {
        changed.locale = preferences.locale;
      }
      if (preferences.displayMode !== previous.displayMode) {
        changed.displayMode = preferences.displayMode;
      }
      if (preferences.safeArea !== previous.safeArea) {
        changed.safeAreaInsets = preferences.safeArea?.insets;
      }
      if (preferences.userAgent !== previous.userAgent) {
        changed.platform =
          preferences.userAgent?.device?.type === "mobile" ? "mobile" : "web";
        changed.deviceCapabilities = preferences.userAgent?.capabilities;
      }
      if (Object.keys(changed).length > 0) {
        post({
          jsonrpc: "2.0",
          method: "ui/notifications/host-context-changed",
          params: changed,
        });
      }
    },
  );

  return () => {
    window.removeEventListener("message", handleMessage);
    unsubscribePreferences();
  };
}

/**
 * Push tool-input notification to the iframe.
 */
export function pushToolInputNotification(
  iframe: HTMLIFrameElement,
  args: Record<string, unknown>,
) {
  iframe.contentWindow?.postMessage(
    {
      jsonrpc: "2.0",
      method: "ui/notifications/tool-input",
      params: { arguments: args },
    },
    "*",
  );
}

/**
 * Push tool-result notification to the iframe.
 */
export function pushToolResultNotification(
  iframe: HTMLIFrameElement,
  result: {
    content: unknown[];
    structuredContent: Record<string, unknown> | null | undefined;
    isError?: boolean;
    _meta?: Record<string, unknown> | null;
  },
) {
  iframe.contentWindow?.postMessage(
    {
      jsonrpc: "2.0",
      method: "ui/notifications/tool-result",
      params: {
        content: result.content ?? [],
        structuredContent: result.structuredContent ?? {},
        isError: result.isError ?? false,
        _meta: result._meta ?? {},
      },
    },
    "*",
  );
}
