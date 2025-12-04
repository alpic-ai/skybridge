import { render } from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from "vitest";
import { DataLLM } from "./data-llm.js";

describe("DataLLM", () => {
  let OpenaiMock: { widgetState: unknown; setWidgetState: Mock };

  beforeEach(() => {
    OpenaiMock = {
      widgetState: {},
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
  });

  afterEach(() => {
    vi.resetAllMocks();
    // Keep the mock available for React cleanup, but reset it
    if (typeof window !== "undefined" && (window as any).openai) {
      (window as any).openai.setWidgetState = vi.fn();
      (window as any).openai.widgetState = {};
    }
  });

  it("should register a node with content and call setWidgetState", () => {
    render(
      <DataLLM content="Test content">
        <div>Child</div>
      </DataLLM>
    );

    expect(OpenaiMock.setWidgetState).toHaveBeenCalled();
    const callArgs = OpenaiMock.setWidgetState.mock.calls[0]?.[0];
    expect(callArgs).toHaveProperty("__widget_context");
    expect(callArgs?.__widget_context).toContain("- Test content");
  });
  it("should preserve existing widgetState when updating context", () => {
    OpenaiMock.widgetState = { existingKey: "existingValue" };

    render(
      <DataLLM content="Test content">
        <div>Child</div>
      </DataLLM>
    );

    const callArgs = OpenaiMock.setWidgetState.mock.calls[0]?.[0];
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
      </DataLLM>
    );

    const callArgs =
      OpenaiMock.setWidgetState.mock.calls[
        OpenaiMock.setWidgetState.mock.calls.length - 1
      ]?.[0];
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
      </DataLLM>
    );

    const initialCalls = OpenaiMock.setWidgetState.mock.calls.length;

    rerender(
      <DataLLM content="Updated content">
        <div>Child</div>
      </DataLLM>
    );

    expect(OpenaiMock.setWidgetState.mock.calls.length).toBeGreaterThan(
      initialCalls
    );
    const lastCallArgs =
      OpenaiMock.setWidgetState.mock.calls[
        OpenaiMock.setWidgetState.mock.calls.length - 1
      ]?.[0];
    expect(lastCallArgs?.__widget_context).toContain("- Updated content");
  });

  it("should remove node and update context when component unmounts", () => {
    const { unmount } = render(
      <DataLLM content="Content to remove">
        <div>Child</div>
      </DataLLM>
    );

    const callsBeforeUnmount = OpenaiMock.setWidgetState.mock.calls.length;

    unmount();

    expect(OpenaiMock.setWidgetState.mock.calls.length).toBeGreaterThan(
      callsBeforeUnmount
    );
    const lastCallArgs =
      OpenaiMock.setWidgetState.mock.calls[
        OpenaiMock.setWidgetState.mock.calls.length - 1
      ]?.[0];
    expect(lastCallArgs?.__widget_context).not.toContain("Content to remove");
  });
});
