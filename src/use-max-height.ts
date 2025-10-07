import { useOpenaiGlobal } from "./use-openai-global";

export const useMaxHeight = (): number | null => {
  return useOpenaiGlobal("maxHeight");
};
