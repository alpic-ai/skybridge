import { useAppsSdkBridge } from "../bridges/use-apps-sdk-bridge.js";
import type { UserAgent } from "../types.js";

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
  const locale = useAppsSdkBridge("locale");
  const userAgent = useAppsSdkBridge("userAgent");

  return { locale, userAgent };
}
