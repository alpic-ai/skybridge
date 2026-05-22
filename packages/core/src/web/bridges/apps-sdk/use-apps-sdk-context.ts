import { useSyncExternalStore } from "react";
import { AppsSdkBridge } from "./bridge.js";
import type { AppsSdkContext } from "./types.js";

/**
 * Read a single key from the raw Apps SDK (`window.openai`) context.
 *
 * Advanced escape hatch — prefer the cross-host hooks (`useLayout`, `useUser`,
 * `useToolInfo`, etc.) which work in both Apps SDK and MCP Apps. Reach for
 * this when you need ChatGPT-only fields not surfaced by the public hooks.
 *
 * Throws if called outside the Apps SDK runtime.
 *
 * @see https://docs.skybridge.tech/api-reference/use-apps-sdk-context
 */
export function useAppsSdkContext<K extends keyof AppsSdkContext>(
  key: K,
): AppsSdkContext[K] {
  const bridge = AppsSdkBridge.getInstance();
  return useSyncExternalStore(bridge.subscribe(key), () =>
    bridge.getSnapshot(key),
  );
}
