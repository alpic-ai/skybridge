import type {
  McpUiHostContext,
  McpUiInitializeResult,
  McpUiToolInputNotification,
  McpUiToolResultNotification,
} from "@modelcontextprotocol/ext-apps";
import { fireEvent } from "@testing-library/react";
import { act } from "react";
import { vi } from "vitest";

export class MockResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

const DEFAULT_CONTEXT: McpUiHostContext = {};

export const getMcpAppHostPostMessageMock = (
  initialContext: McpUiHostContext = DEFAULT_CONTEXT,
) =>
  vi.fn((message: { method: string; id: number }) => {
    if (message.method === "ui/initialize") {
      const result: McpUiInitializeResult = {
        protocolVersion: "2025-06-18",
        hostInfo: { name: "test-host", version: "1.0.0" },
        hostCapabilities: {},
        hostContext: initialContext,
      };
      act(() =>
        fireEvent(
          window,
          new MessageEvent<{
            jsonrpc: "2.0";
            id: number;
            result: McpUiInitializeResult;
          }>("message", {
            data: {
              jsonrpc: "2.0",
              id: message.id,
              result,
            },
          }),
        ),
      );
    } else if (message.method === "ui/update-model-context") {
      act(() =>
        fireEvent(
          window,
          new MessageEvent<{ jsonrpc: "2.0"; id: number; result: unknown }>(
            "message",
            {
              data: {
                jsonrpc: "2.0",
                id: message.id,
                result: {},
              },
            },
          ),
        ),
      );
    }
  });

export const fireToolInputNotification = (args: Record<string, unknown>) => {
  fireEvent(
    window,
    new MessageEvent<McpUiToolInputNotification & { jsonrpc: "2.0" }>(
      "message",
      {
        data: {
          jsonrpc: "2.0",
          method: "ui/notifications/tool-input",
          params: {
            arguments: args,
          },
        },
      },
    ),
  );
};

export const fireToolResultNotification = (params: {
  content: McpUiToolResultNotification["params"]["content"];
  structuredContent: Record<string, unknown>;
  _meta?: Record<string, unknown>;
}) => {
  fireEvent(
    window,
    new MessageEvent<McpUiToolResultNotification & { jsonrpc: "2.0" }>(
      "message",
      {
        data: {
          jsonrpc: "2.0",
          method: "ui/notifications/tool-result",
          params,
        },
      },
    ),
  );
};
