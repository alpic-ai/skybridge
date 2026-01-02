import { getBridgeMethod } from "../bridges/get-bridge-method.js";
import { useBridge } from "../bridges/index.js";

export function useDisplayMode() {
  const displayMode = useBridge("displayMode");
  const setDisplayMode = getBridgeMethod("requestDisplayMode");

  return [displayMode, setDisplayMode] as const;
}
