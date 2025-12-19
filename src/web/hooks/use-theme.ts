import { useAppsSdkBridge } from "../bridges/use-apps-sdk-bridge.js";

/**
 * @deprecated Use `useLayout()` instead.
 */
export function useTheme() {
  return useAppsSdkBridge("theme");
}
