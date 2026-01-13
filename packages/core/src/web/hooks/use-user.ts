import { type UserAgent, useHostContext } from "../bridges/index.js";

export type UserState = {
  locale: string;
  userAgent: UserAgent;
};

/**
 * Hook for accessing session-stable user information.
 * These values are set once at initialization and do not change during the session.
 *
 * @example
 * ```tsx
 * const { locale, userAgent } = useUser();
 *
 * // Access device type
 * const isMobile = userAgent.device.type === "mobile";
 * ```
 */
export function useUser(): UserState {
  const locale = useHostContext("locale");
  const userAgent = useHostContext("userAgent");

  return { locale, userAgent };
}
