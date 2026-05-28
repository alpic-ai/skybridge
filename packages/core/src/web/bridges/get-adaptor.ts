import { HostAdaptor } from "./adaptor.js";
import type { Adaptor } from "./types.js";

let cached: HostAdaptor | null = null;

/**
 * @internal
 * Resolve the single host {@link Adaptor} instance. Prefer the documented
 * hooks (`useCallTool`, `useViewState`, etc.) over calling this directly;
 * it's the escape hatch used by the hooks themselves and by advanced
 * integrations.
 */
export const getAdaptor = (): Adaptor => {
  if (cached) {
    return cached;
  }

  const hostType =
    typeof window !== "undefined" ? window.skybridge?.hostType : undefined;
  const hasOai = typeof window !== "undefined" && window.openai !== undefined;

  if (hostType === "mcp-app" && hasOai) {
    console.warn(
      "[skybridge] hostType is 'mcp-app' but window.openai is present; trusting the probe.",
    );
  } else if (hostType === "apps-sdk" && !hasOai) {
    console.warn(
      "[skybridge] hostType is 'apps-sdk' but window.openai is absent; trusting the probe.",
    );
  }

  cached = new HostAdaptor();
  return cached;
};

/** @internal Test-only. */
export const _resetAdaptor = (): void => {
  cached?.cleanup();
  cached = null;
};
