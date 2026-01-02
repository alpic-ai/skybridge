import { getBridgeMethods } from "../bridges/index.js";

export function useOpenExternal() {
  const { openExternal } = getBridgeMethods();

  return openExternal;
}
