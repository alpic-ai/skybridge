import { parseAsString, useQueryState } from "nuqs";

export function useSelectedToolName() {
  return useQueryState("tool", parseAsString);
}
