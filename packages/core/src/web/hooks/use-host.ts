import { type Host, useHostContext } from "../bridges/index.js";

export type HostState = Host;

/**
 * Hook for identifying the current host rendering the view.
 *
 * Returns a best-effort, normalized host name inferred from the MCP Apps
 * host context and ChatGPT runtime signals.
 */
export function useHost(): HostState {
  return useHostContext("host");
}
