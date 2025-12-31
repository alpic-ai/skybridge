import type { CallToolResponse, Methods } from "./types.js";

export const callTool = async <
  ToolArgs extends Record<string, unknown> | null = null,
  ToolResponse extends CallToolResponse = CallToolResponse,
>(
  name: string,
  args: ToolArgs,
): Promise<ToolResponse> => {
  return window.openai.callTool<ToolArgs, ToolResponse>(name, args);
};

export const requestDisplayMode: Methods["requestDisplayMode"] = ({ mode }) => {
  return window.openai.requestDisplayMode({ mode });
};

export const sendFollowUpMessage: Methods["sendFollowUpMessage"] = (prompt) => {
  return window.openai.sendFollowUpMessage({ prompt });
};
