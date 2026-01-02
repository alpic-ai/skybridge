import type {
  McpUiHostContext,
  McpUiInitializeRequest,
  McpUiInitializeResult,
  McpUiToolInputNotification,
  McpUiToolResultNotification,
} from "@modelcontextprotocol/ext-apps";
import { fireEvent } from "@testing-library/react";
import { act } from "react";
import { vi } from "vitest";

const MOCK_HOST_INFO: McpUiInitializeResult = {
  protocolVersion: "2025-06-18",
  hostInfo: { name: "test-host", version: "1.0.0" },
  hostCapabilities: {},
  hostContext: { theme: "light" },
};

export const MCPAppHostPostMessageMock = vi.fn(
  (message: McpUiInitializeRequest & { id: number }) => {
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
            result: MOCK_HOST_INFO,
          },
        }),
      ),
    );
  },
);

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

export const fireHostContextChangedNotification = (
  context: McpUiHostContext,
) => {
  fireEvent(
    window,
    new MessageEvent("message", {
      data: {
        jsonrpc: "2.0",
        method: "ui/notifications/host-context-changed",
        params: context,
      },
    }),
  );
};
