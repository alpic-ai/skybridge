import type { Implementation } from "@modelcontextprotocol/client";
import type {
  McpUiHostCapabilities,
  McpUiHostContext,
  McpUiToolCancelledNotification,
  McpUiToolInputNotification,
  McpUiToolResultNotification,
  McpUiUpdateModelContextRequest,
} from "@modelcontextprotocol/ext-apps";

export type McpToolState = {
  toolInput: NonNullable<
    McpUiToolInputNotification["params"]["arguments"]
  > | null;
  toolResult: McpUiToolResultNotification["params"] | null;
  toolCancelled: McpUiToolCancelledNotification["params"] | null;
  hostInfo: Implementation | null;
  hostCapabilities: McpUiHostCapabilities | null;
};

/** ChatGPT-only host context keys from the OpenAI MCP extensions. */
export type OpenAIHostContext = {
  /**
   * App-relative URL the view was opened on through a deep link. Older hosts
   * send it split into `path` segments and `query` pairs.
   */
  "openai/deepLink"?:
    | { url: string }
    | { path: string[]; query: [string, string][] };
  /**
   * Context this view attached to the conversation. `null` once the user
   * removed it, for example by deleting its composer attachment.
   */
  "openai/modelContext"?:
    | (McpUiUpdateModelContextRequest["params"] & { updateId: string })
    | null;
};

export type McpAppContext = McpUiHostContext & OpenAIHostContext & McpToolState;

export type McpAppContextKey = keyof McpAppContext;
