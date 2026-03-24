import type { Implementation } from "@modelcontextprotocol/sdk/types.js";

import { useSyncExternalStore } from "react";
import { McpAppBridge } from "./bridge.js";
import type { McpAppContext } from "./types.js";

type McpAppInitializationOptions = {
  appInfo: Implementation;
};

export function useMcpAppContext<K extends keyof McpAppContext>(
  key: K,
  options?: Partial<McpAppInitializationOptions>,
): McpAppContext[K] {
  const bridge = McpAppBridge.getInstance(options);
  return useSyncExternalStore(bridge.subscribe(key), () =>
    bridge.getSnapshot(key),
  );
}
