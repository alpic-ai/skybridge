import { type UserAgent, useHostContext } from "../bridges/index.js";

export type UserState = {
  locale: string;
  userAgent: UserAgent;
};

const DEFAULT_LOCALE = "en-US";

/**
 * Normalizes a locale string to canonical BCP 47 format using {@link Intl.Locale}.
 *
 * Handles underscored identifiers returned by the ChatGPT mobile app (e.g. "fr_FR" → "fr-FR"),
 * incorrect casing (e.g. "en-us" → "en-US"), and complex subtags (e.g. "zh_Hans_CN" → "zh-Hans-CN").
 * Falls back to "en-US" if the locale is invalid.
 */
function normalizeLocale(locale: string): string {
  try {
    return new Intl.Locale(locale.replace(/_/g, "-")).toString();
  } catch {
    return DEFAULT_LOCALE;
  }
}

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
  const rawLocale = useHostContext("locale");
  const userAgent = useHostContext("userAgent");

  return { locale: normalizeLocale(rawLocale), userAgent };
}
