import type { UserAgent } from "../types.js";
import { useOpenAiGlobal } from "./use-openai-global.js";

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
  const locale = useOpenAiGlobal("locale");
  const userAgent = useOpenAiGlobal("userAgent");

  return { locale, userAgent };
}
