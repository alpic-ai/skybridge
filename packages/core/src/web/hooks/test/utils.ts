import type {
  McpUiInitializeRequest,
  McpUiInitializeResult,
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
