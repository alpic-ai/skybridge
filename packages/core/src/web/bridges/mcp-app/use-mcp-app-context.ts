import type { McpUiInitializeRequest } from "@modelcontextprotocol/ext-apps";

import { useSyncExternalStore } from "react";
import { McpAppBridge } from "./bridge.js";
import type { McpAppContext } from "./types.js";

type McpAppInitializationOptions = Pick<
  McpUiInitializeRequest["params"],
  "appInfo"
>;

export function useMcpAppContext<K extends keyof McpAppContext>(
  key: K,
  options?: Partial<McpAppInitializationOptions>,
  requestTimeout?: number,
): McpAppContext[K] {
  const bridge = McpAppBridge.getInstance(options, requestTimeout);
  return useSyncExternalStore(bridge.subscribe(key), () =>
    bridge.getSnapshot(key),
  );
}
