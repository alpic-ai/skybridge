import type { Methods } from "./types";

export const requestDisplayMode: Methods["requestDisplayMode"] = ({ mode }) => {
  return window.openai.requestDisplayMode({ mode });
};
