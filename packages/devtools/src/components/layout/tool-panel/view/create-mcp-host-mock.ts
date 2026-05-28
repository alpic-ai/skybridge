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
  const prefs = useInspectorPreferencesStore.getState();
  return {
    theme: prefs.theme,
    locale: prefs.locale,
    displayMode: prefs.displayMode,
    safeAreaInsets: prefs.safeArea?.insets ?? {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
    platform: prefs.userAgent?.device?.type === "mobile" ? "mobile" : "web",
    deviceCapabilities: prefs.userAgent?.capabilities,
  };
}

export type McpHostMockCleanup = () => void;

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
  const unsubPrefs = useInspectorPreferencesStore.subscribe((prefs, prev) => {
    const changed: HostContext = {};
    if (prefs.theme !== prev.theme) {
      changed.theme = prefs.theme;
    }
    if (prefs.locale !== prev.locale) {
      changed.locale = prefs.locale;
    }
    if (prefs.displayMode !== prev.displayMode) {
      changed.displayMode = prefs.displayMode;
    }
    if (prefs.safeArea !== prev.safeArea) {
      changed.safeAreaInsets = prefs.safeArea?.insets;
    }
    if (prefs.userAgent !== prev.userAgent) {
      changed.platform =
        prefs.userAgent?.device?.type === "mobile" ? "mobile" : "web";
      changed.deviceCapabilities = prefs.userAgent?.capabilities;
    }
    if (Object.keys(changed).length > 0) {
      post({
        jsonrpc: "2.0",
        method: "ui/notifications/host-context-changed",
        params: changed,
      });
    }
  });

  return () => {
    window.removeEventListener("message", handleMessage);
    unsubPrefs();
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
