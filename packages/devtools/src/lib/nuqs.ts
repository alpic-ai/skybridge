import { parseAsBoolean, parseAsString, useQueryState } from "nuqs";

export function useSelectedToolName() {
  return useQueryState("tool", parseAsString);
}

export function useEvalsPage() {
  return useQueryState("evals", parseAsBoolean.withDefault(false));
}
