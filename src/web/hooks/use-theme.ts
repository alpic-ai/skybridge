import { useAppsSdkBridge } from "../bridges/use-apps-sdk-bridge.js";

export function useTheme() {
  return useAppsSdkBridge("theme");
}
