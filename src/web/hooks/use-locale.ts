import { useAppsSdkBridge } from "../bridges/use-apps-sdk-bridge.js";

export function useLocale() {
  return useAppsSdkBridge("locale");
}
