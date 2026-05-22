import type { Implementation } from "@modelcontextprotocol/sdk/types.js";

import { useSyncExternalStore } from "react";
import { McpAppBridge } from "./bridge.js";
import type { McpAppContext } from "./types.js";

type McpAppInitializationOptions = {
  appInfo: Implementation;
};

/**
 * Read a single key from the raw MCP Apps (`ext-apps`) bridge context.
 *
 * Advanced escape hatch — prefer the cross-host hooks (`useToolInfo`,
 * `useLayout`, etc.) which work in both MCP Apps and Apps SDK. Reach for this
 * when you need protocol-level fields not surfaced by the public hooks.
 *
 * `options.appInfo` is honored only on the first call that creates the
 * underlying bridge; subsequent calls reuse the singleton.
 *
 * @see https://docs.skybridge.tech/api-reference/use-mcp-app-context
 */
export function useMcpAppContext<K extends keyof McpAppContext>(
  key: K,
  options?: Partial<McpAppInitializationOptions>,
): McpAppContext[K] {
  const bridge = McpAppBridge.getInstance(options);
  return useSyncExternalStore(bridge.subscribe(key), () =>
    bridge.getSnapshot(key),
  );
}
