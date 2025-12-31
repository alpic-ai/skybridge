import type { Methods } from "./types.js";

export const requestDisplayMode: Methods["requestDisplayMode"] = ({ mode }) => {
  return window.openai.requestDisplayMode({ mode });
};

export const sendFollowUpMessage: Methods["sendFollowUpMessage"] = ({
  prompt,
}) => {
  return window.openai.sendFollowUpMessage({ prompt });
};
