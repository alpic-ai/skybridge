import { cleanup, render } from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from "vitest";
import { McpAppAdaptor, McpAppBridge } from "./bridges/mcp-app/index.js";
import { DataLLM } from "./data-llm.js";
import {
  getMcpAppHostPostMessageMock,
  MockResizeObserver,
} from "./hooks/test/utils.js";

describe("DataLLM", () => {
  afterEach(() => {
    // Clean up React components BEFORE unstubbing globals
    cleanup();
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  describe("apps-sdk mode", () => {
    let OpenaiMock: { widgetState: unknown; setWidgetState: Mock };

    beforeEach(() => {
      OpenaiMock = {
        widgetState: { modelContent: {} },
        setWidgetState: vi.fn(),
      };
      // Use Object.defineProperty to ensure it persists
      Object.defineProperty(globalThis, "openai", {
        value: OpenaiMock,
        writable: true,
        configurable: true,
      });
      // Also set on window for browser-like environment
      if (typeof window !== "undefined") {
        Object.defineProperty(window, "openai", {
          value: OpenaiMock,
          writable: true,
          configurable: true,
        });
      }
      vi.stubGlobal("openai", OpenaiMock);
      vi.stubGlobal("skybridge", { hostType: "apps-sdk" });
    });

    afterEach(() => {
      // Keep the mock available for React cleanup, but reset it
      if (typeof window !== "undefined" && window.openai) {
        window.openai.setWidgetState = vi.fn();
        window.openai.widgetState = { modelContent: {} };
      }
    });

    it("should register a node with content and call setWidgetState", () => {
      render(
        <DataLLM content="Test content">
          <div>Child</div>
        </DataLLM>,
      );

      expect(OpenaiMock.setWidgetState).toHaveBeenCalled();
      const callArgs =
        OpenaiMock.setWidgetState.mock.calls[0]?.[0]?.modelContent;
      expect(callArgs).toHaveProperty("__widget_context");
      expect(callArgs?.__widget_context).toContain("- Test content");
    });
    it("should preserve existing widgetState when updating context", () => {
      OpenaiMock.widgetState = {
        modelContent: { existingKey: "existingValue" },
      };

      render(
        <DataLLM content="Test content">
          <div>Child</div>
        </DataLLM>,
      );

      const callArgs =
        OpenaiMock.setWidgetState.mock.calls[0]?.[0]?.modelContent;
      expect(callArgs).toHaveProperty("existingKey", "existingValue");
      expect(callArgs).toHaveProperty("__widget_context");
    });

    it("should handle deeply nested DataLLM components", () => {
      render(
        <DataLLM content="Level 1">
          <DataLLM content="Level 2A" />
          <DataLLM content="Level 2B">
            <DataLLM content="Level 3">
              <div>Content</div>
            </DataLLM>
          </DataLLM>
        </DataLLM>,
      );

      const callArgs =
        OpenaiMock.setWidgetState.mock.calls[
          OpenaiMock.setWidgetState.mock.calls.length - 1
        ]?.[0]?.modelContent;
      const context = callArgs?.__widget_context as string;
      expect(context).toContain("- Level 1");
      expect(context).toContain("  - Level 2A");
      expect(context).toContain("  - Level 2B");
      expect(context).toContain("    - Level 3");
    });

    it("should update context when content changes", () => {
      const { rerender } = render(
        <DataLLM content="Initial content">
          <div>Child</div>
        </DataLLM>,
      );

      const initialCalls = OpenaiMock.setWidgetState.mock.calls.length;

      rerender(
        <DataLLM content="Updated content">
          <div>Child</div>
        </DataLLM>,
      );

      expect(OpenaiMock.setWidgetState.mock.calls.length).toBeGreaterThan(
        initialCalls,
      );
      const lastCallArgs =
        OpenaiMock.setWidgetState.mock.calls[
          OpenaiMock.setWidgetState.mock.calls.length - 1
        ]?.[0]?.modelContent;
      expect(lastCallArgs?.__widget_context).toContain("- Updated content");
    });

    it("should remove node and update context when component unmounts", () => {
      const { unmount } = render(
        <DataLLM content="Content to remove">
          <div>Child</div>
        </DataLLM>,
      );

      const callsBeforeUnmount = OpenaiMock.setWidgetState.mock.calls.length;

      unmount();

      expect(OpenaiMock.setWidgetState.mock.calls.length).toBeGreaterThan(
        callsBeforeUnmount,
      );
      const lastCallArgs =
        OpenaiMock.setWidgetState.mock.calls[
          OpenaiMock.setWidgetState.mock.calls.length - 1
        ]?.[0]?.modelContent;
      expect(lastCallArgs?.__widget_context).not.toContain("Content to remove");
    });
  });

  describe("mcp-app mode", () => {
    let postMessageMock: ReturnType<typeof getMcpAppHostPostMessageMock>;

    beforeEach(() => {
      vi.stubGlobal("skybridge", { hostType: "mcp-app" });
      vi.stubGlobal("ResizeObserver", MockResizeObserver);
      postMessageMock = getMcpAppHostPostMessageMock();
      vi.stubGlobal("parent", { postMessage: postMessageMock });
    });

    afterEach(() => {
      McpAppBridge.resetInstance();
      McpAppAdaptor.resetInstance();
    });

    it("should register a node and update widget state via adaptor", async () => {
      const adaptor = McpAppAdaptor.getInstance();

      render(
        <DataLLM content="Test content">
          <div>Child</div>
        </DataLLM>,
      );

      await vi.waitFor(() => {
        const widgetState = adaptor
          .getHostContextStore("widgetState")
          .getSnapshot();
        expect(widgetState?.__widget_context).toContain("- Test content");
      });
    });

    it("should preserve existing widget state when updating context", async () => {
      const adaptor = McpAppAdaptor.getInstance();
      await adaptor.setWidgetState({ existingKey: "existingValue" });

      render(
        <DataLLM content="Test content">
          <div>Child</div>
        </DataLLM>,
      );

      await vi.waitFor(() => {
        const widgetState = adaptor
          .getHostContextStore("widgetState")
          .getSnapshot();
        expect(widgetState?.existingKey).toBe("existingValue");
        expect(widgetState?.__widget_context).toContain("- Test content");
      });
    });

    it("should handle multiple DataLLM components sharing state through adaptor", async () => {
      const adaptor = McpAppAdaptor.getInstance();

      render(
        <>
          <DataLLM content="First component">
            <div>First</div>
          </DataLLM>
          <DataLLM content="Second component">
            <div>Second</div>
          </DataLLM>
        </>,
      );

      await vi.waitFor(() => {
        const widgetState = adaptor
          .getHostContextStore("widgetState")
          .getSnapshot();
        const context = widgetState?.__widget_context as string;
        expect(context).toContain("- First component");
        expect(context).toContain("- Second component");
      });
    });

    it("should call ui/update-model-context when widget state changes", async () => {
      render(
        <DataLLM content="Test content">
          <div>Child</div>
        </DataLLM>,
      );

      await vi.waitFor(() => {
        expect(postMessageMock).toHaveBeenCalledWith(
          expect.objectContaining({ method: "ui/update-model-context" }),
          "*",
        );
      });
    });
  });
});
