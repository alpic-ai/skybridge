import type { McpUiInitializeRequest } from "@modelcontextprotocol/ext-apps";

import { useSyncExternalStore } from "react";
import { McpAppBridge, type McpAppBridgeContext } from "../mcp-app-bridge.js";

type McpAppInitializationOptions = Pick<
  McpUiInitializeRequest["params"],
  "appInfo"
>;

export function useMcpAppBridge<K extends keyof McpAppBridgeContext>(
  key: K,
  options?: Partial<McpAppInitializationOptions>,
  requestTimeout?: number,
): McpAppBridgeContext[K] {
  const bridge = McpAppBridge.getInstance(options, requestTimeout);
  return useSyncExternalStore(bridge.subscribe(key), () =>
    bridge.getSnapshot(key),
  );
}
