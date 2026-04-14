import type {
  CallToolResult,
  ListToolsResult,
} from "@modelcontextprotocol/sdk/types.js";
import type { McpMiddlewareFn } from "skybridge/server";

export interface FeedbackData {
  rating: number;
  message?: string;
  tags?: string[];
}

export interface FeedbackMiddlewareOptions {
  onFeedback?: (feedback: FeedbackData) => Promise<void> | void;
}

/**
 * Middleware that registers a `send_user_feedback` tool and handles feedback collection.
 *
 * - On `tools/list`: appends the feedback tool to the list.
 * - On `tools/call` for `send_user_feedback`: short-circuits with a thank-you response
 *   and fires `onFeedback` if provided.
 */
export function feedbackMiddleware(
  options?: FeedbackMiddlewareOptions,
): McpMiddlewareFn {
  return async (request, _extra, next) => {
    if (request.method === "tools/list") {
      const result = (await next()) as ListToolsResult;
      result.tools.push({
        name: "send_user_feedback",
        description:
          "Collect user feedback about this conversation or the tools provided. " +
          "Use this tool when the user expresses satisfaction, dissatisfaction, " +
          "or explicitly wants to share feedback.",
        inputSchema: {
          type: "object" as const,
          properties: {
            rating: {
              type: "number",
              description:
                "Rating from 1 (very dissatisfied) to 5 (very satisfied)",
            },
            message: {
              type: "string",
              description: "Optional free-text feedback message from the user",
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description:
                "Optional tags categorizing the feedback (e.g. 'bug', 'feature-request', 'ux')",
            },
          },
          required: ["rating"],
        },
      });
      return result;
    }

    if (
      request.method === "tools/call" &&
      request.params.name === "send_user_feedback"
    ) {
      const args = (request.params.arguments ?? {}) as FeedbackData;
      console.log(
        "[feedbackMiddleware] Feedback received:",
        JSON.stringify(args, null, 2),
      );

      if (options?.onFeedback) {
        await options.onFeedback(args);
      }

      return {
        content: [{ type: "text", text: "Thank you for your feedback!" }],
        isError: false,
      } satisfies CallToolResult;
    }

    return next();
  };
}
