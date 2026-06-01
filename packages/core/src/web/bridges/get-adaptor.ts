import { AppsSdkAdaptor } from "./apps-sdk/adaptor.js";
import { McpAppAdaptor } from "./mcp-app/adaptor.js";
import type { Adaptor } from "./types.js";

/**
 * @internal
 * Resolve the host-specific {@link Adaptor} based on `window.skybridge.hostType`.
 * Prefer the documented hooks (`useCallTool`, `useViewState`, etc.) over
 * calling this directly — it's the escape hatch used by the hooks themselves
 * and by advanced integrations.
 */
export const getAdaptor = (): Adaptor => {
  return window.skybridge.hostType === "apps-sdk"
    ? AppsSdkAdaptor.getInstance()
    : McpAppAdaptor.getInstance();
};
