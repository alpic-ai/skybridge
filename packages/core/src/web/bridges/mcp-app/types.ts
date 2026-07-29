import type {
  McpUiHostContext,
  McpUiToolCancelledNotification,
  McpUiToolInputNotification,
  McpUiToolResultNotification,
} from "@modelcontextprotocol/ext-apps";
import type { Implementation } from "@modelcontextprotocol/sdk/types.js";

export type McpToolState = {
  toolInput: NonNullable<
    McpUiToolInputNotification["params"]["arguments"]
  > | null;
  toolResult: McpUiToolResultNotification["params"] | null;
  toolCancelled: McpUiToolCancelledNotification["params"] | null;
};

export type McpAppContext = McpUiHostContext &
  McpToolState & {
    hostInfo?: Implementation;
  };

export type McpAppContextKey = keyof McpAppContext;
