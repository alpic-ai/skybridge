import type {
  ContentBlock,
  Implementation,
} from "@modelcontextprotocol/client";
import type {
  McpUiHostCapabilities,
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
  hostInfo: Implementation | null;
  hostCapabilities: McpUiHostCapabilities | null;
};

/** ChatGPT-only host context keys from the OpenAI MCP extensions. */
export type OpenAIHostContext = {
  /** App-relative URL the view was opened on through a deep link. */
  "openai/deepLink"?: { url: string };
  /**
   * Context this view attached to the conversation. `null` once the user
   * removed it, for example by deleting its composer attachment.
   */
  "openai/modelContext"?: {
    updateId: string;
    content?: ContentBlock[];
    structuredContent?: Record<string, unknown>;
  } | null;
};

export type McpAppContext = McpUiHostContext & OpenAIHostContext & McpToolState;

export type McpAppContextKey = keyof McpAppContext;
