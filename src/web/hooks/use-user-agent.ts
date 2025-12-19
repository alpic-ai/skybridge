import { useAppsSdkBridge } from "../bridges/use-apps-sdk-bridge.js";

/**
 * @deprecated Use `useUser()` instead.
 */
export function useUserAgent() {
  return useAppsSdkBridge("userAgent");
}
