import type {
  McpUiHostContext,
  McpUiInitializeRequest,
} from "@modelcontextprotocol/ext-apps";

import { useSyncExternalStore } from "react";
import { McpAppBridge } from "../mcp-app-bridge.js";

type McpAppInitializationOptions = Pick<
  McpUiInitializeRequest["params"],
  "appInfo"
>;

export function useMcpAppBridge<K extends keyof McpUiHostContext>(
  key: K,
  options?: Partial<McpAppInitializationOptions>,
  requestTimeout?: number,
): McpUiHostContext[K] {
  const bridge = McpAppBridge.getInstance(options, requestTimeout);
  return useSyncExternalStore(bridge.subscribe(key), () =>
    bridge.getSnapshot(key),
  );
}
