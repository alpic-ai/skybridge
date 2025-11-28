import { useToolInfo } from "./use-tool-info.js";

/**
 * @deprecated This hook is deprecated. Use `useToolInfo()` instead and access the `output` property.
 */
export function useToolOutput() {
  const { output } = useToolInfo();

  return output;
}
