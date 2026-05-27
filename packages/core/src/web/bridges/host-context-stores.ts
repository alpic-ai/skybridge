import { dequal } from "dequal/lite";
import type { HostContextStore } from "./types.js";
import type { McpAppBridge } from "./mcp-app/bridge.js";
import type {
  McpAppContext,
  McpAppContextKey,
} from "./mcp-app/types.js";

type PickContext<K extends readonly McpAppContextKey[]> = {
  [P in K[number]]: McpAppContext[P];
};

/**
 * Build a memoized {@link HostContextStore} backed by one or more
 * `McpAppBridge` context keys. Recomputed values are deep-compared via
 * `dequal` so unchanged snapshots return the cached reference.
 */
function createMcpStore<const Keys extends readonly McpAppContextKey[], R>(
  bridge: McpAppBridge,
  keys: Keys,
  computeSnapshot: (context: PickContext<Keys>) => R,
) {
  let cachedValue: R | undefined;
  return {
    subscribe: bridge.subscribe(keys),
    getSnapshot: () => {
      const context = Object.fromEntries(
        keys.map((k) => [k, bridge.getSnapshot(k)]),
      ) as PickContext<Keys>;
      const newValue = computeSnapshot(context);
      if (cachedValue !== undefined && dequal(cachedValue, newValue)) {
        return cachedValue;
      }
      cachedValue = newValue;
      return newValue;
    },
  };
}

/**
 * Build the host-context store map sourced from the MCP App bridge.
 * `display` and `viewState` are *not* included here; those are handled
 * by the adaptor itself because they have transport-specific overlays
 * and additional state (polyfill modal state, localStorage hydration).
 */
export function buildMcpContextStores(bridge: McpAppBridge): {
  theme: HostContextStore<"theme">;
  locale: HostContextStore<"locale">;
  safeArea: HostContextStore<"safeArea">;
  displayMode: HostContextStore<"displayMode">;
  maxHeight: HostContextStore<"maxHeight">;
  userAgent: HostContextStore<"userAgent">;
  toolInput: HostContextStore<"toolInput">;
  toolOutput: HostContextStore<"toolOutput">;
  toolResponseMetadata: HostContextStore<"toolResponseMetadata">;
} {
  return {
    theme: createMcpStore(bridge, ["theme"], ({ theme }) => theme ?? "light"),
    locale: createMcpStore(
      bridge,
      ["locale"],
      ({ locale }) => locale ?? "en-US",
    ),
    safeArea: createMcpStore(bridge, ["safeAreaInsets"], ({ safeAreaInsets }) => ({
      insets: safeAreaInsets ?? { top: 0, right: 0, bottom: 0, left: 0 },
    })),
    displayMode: createMcpStore(
      bridge,
      ["displayMode"],
      ({ displayMode }) => displayMode ?? "inline",
    ),
    maxHeight: createMcpStore(
      bridge,
      ["containerDimensions"],
      ({ containerDimensions }) => {
        if (containerDimensions && "maxHeight" in containerDimensions) {
          return containerDimensions.maxHeight;
        }
        return undefined;
      },
    ),
    userAgent: createMcpStore(
      bridge,
      ["platform", "deviceCapabilities"],
      ({ platform, deviceCapabilities }) => ({
        device: {
          type: platform === "web" ? "desktop" : (platform ?? "unknown"),
        },
        capabilities: {
          hover: true,
          touch: true,
          ...deviceCapabilities,
        },
      }),
    ),
    toolInput: createMcpStore(
      bridge,
      ["toolInput"],
      ({ toolInput }) => toolInput ?? null,
    ),
    toolOutput: createMcpStore(
      bridge,
      ["toolResult"],
      ({ toolResult }) => toolResult?.structuredContent ?? null,
    ),
    toolResponseMetadata: createMcpStore(
      bridge,
      ["toolResult"],
      ({ toolResult }) => toolResult?._meta ?? null,
    ),
  };
}

/**
 * Build the Apps-SDK-sourced overlay stores (`display`, `viewState`).
 * Used by `HostAdaptor` only when `window.openai` is present.
 */
export function buildAppsSdkOverlayStores(bridge: import("./apps-sdk/bridge.js").AppsSdkBridge): {
  display: HostContextStore<"display">;
  viewState: HostContextStore<"viewState">;
} {
  return {
    display: {
      subscribe: bridge.subscribe("view"),
      getSnapshot: () => bridge.getSnapshot("view"),
    },
    viewState: {
      subscribe: bridge.subscribe("widgetState"),
      getSnapshot: () =>
        bridge.getSnapshot("widgetState")?.modelContent ?? null,
    },
  };
}
