import type { IBridgeMethods } from "./types";

export const requestDisplayMode: IBridgeMethods["requestDisplayMode"] = ({
  mode,
}) => {
  return window.openai.requestDisplayMode({ mode });
};
