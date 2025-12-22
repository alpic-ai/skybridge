import { useAppsSdkBridge } from "../bridges/use-apps-sdk-bridge.js";

export function useUserAgent() {
  return useAppsSdkBridge("userAgent");
}
