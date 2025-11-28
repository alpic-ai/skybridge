import { useTool } from "./use-tool.js";

/**
 * @deprecated This hook is deprecated. Use `useTool()` instead and access the `output` property.
 */
export function useToolOutput() {
  const { output } = useTool();

  return output;
}
