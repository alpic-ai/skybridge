import type {
  McpUiHostContext,
  McpUiToolCancelledNotification,
  McpUiToolInputNotification,
  McpUiToolResultNotification,
} from "@modelcontextprotocol/ext-apps";

export type McpToolState = {
  toolInput: NonNullable<
    McpUiToolInputNotification["params"]["arguments"]
  > | null;
  toolResult: McpUiToolResultNotification["params"] | null;
  toolCancelled: McpUiToolCancelledNotification["params"] | null;
};

export type McpAppBridgeContext = McpUiHostContext & McpToolState;

export type McpAppBridgeKey = keyof McpAppBridgeContext;
