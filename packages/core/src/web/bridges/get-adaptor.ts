import { HostAdaptor } from "./adaptor.js";
import type { Adaptor } from "./types.js";

/**
 * @internal
 * Resolve the single host {@link Adaptor} instance. Prefer the documented
 * hooks (`useCallTool`, `useViewState`, etc.) over calling this directly;
 * it's the escape hatch used by the hooks themselves and by advanced
 * integrations.
 */
export const getAdaptor = (): Adaptor => HostAdaptor.getInstance();
