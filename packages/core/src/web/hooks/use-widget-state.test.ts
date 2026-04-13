import { act, renderHook, waitFor } from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from "vitest";
import { McpAppAdaptor, McpAppBridge } from "../bridges/mcp-app/index.js";
import {
  fireToolResultNotification,
  getMcpAppHostPostMessageMock,
  MockResizeObserver,
} from "./test/utils.js";
import { useWidgetState } from "./use-widget-state.js";

describe("useWidgetState", () => {
  let OpenaiMock: { widgetState: unknown; setWidgetState: Mock };

  beforeEach(() => {
    OpenaiMock = {
      widgetState: null,
      setWidgetState: vi.fn().mockResolvedValue(undefined),
    };
    vi.stubGlobal("openai", OpenaiMock);
    vi.stubGlobal("skybridge", { hostType: "apps-sdk" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  const defaultState = { count: 0, name: "test" };
  const windowState = { count: 5, name: "window" };

  it("should initialize with default state when window.openai.widgetState is null", () => {
    OpenaiMock.widgetState = null;
    const { result } = renderHook(() => useWidgetState(defaultState));

    expect(result.current[0]).toEqual(defaultState);
  });

  it("should initialize with window.openai.widgetState when available", () => {
    OpenaiMock.widgetState = { modelContent: windowState };
    const { result } = renderHook(() => useWidgetState(defaultState));

    expect(result.current[0]).toEqual(windowState);
  });

  it("should call window.openai.setWidgetState when setWidgetState is called with a new state", async () => {
    const { result } = renderHook(() => useWidgetState(defaultState));
    const newState = { count: 10, name: "updated" };

    act(() => {
      result.current[1](newState);
    });

    expect(OpenaiMock.setWidgetState).toHaveBeenCalledWith({
      modelContent: newState,
      privateContent: {},
    });
    expect(result.current[0]).toEqual(newState);
  });

  it("should call window.openai.setWidgetState when setWidgetState is called with a function updater", async () => {
    const { result } = renderHook(() => useWidgetState(defaultState));

    act(() => {
      result.current[1]((prev) => ({ ...prev, count: prev.count + 1 }));
    });

    expect(OpenaiMock.setWidgetState).toHaveBeenCalledWith({
      modelContent: { count: 1, name: "test" },
      privateContent: {},
    });
    expect(result.current[0]).toEqual({ count: 1, name: "test" });
  });

  it("should update state when window.openai.widgetState changes", () => {
    OpenaiMock.widgetState = { modelContent: defaultState };
    const { result, rerender } = renderHook(() => useWidgetState(defaultState));

    expect(result.current[0]).toEqual(defaultState);

    // Simulate window.openai.widgetState changing
    OpenaiMock.widgetState = { modelContent: windowState };
    // Trigger re-render to simulate the useEffect running
    rerender();

    expect(result.current[0]).toEqual(windowState);
  });
});

describe("useWidgetState (mcp-app host — localStorage persistence)", () => {
  beforeEach(() => {
    vi.stubGlobal("parent", { postMessage: getMcpAppHostPostMessageMock() });
    vi.stubGlobal("skybridge", { hostType: "mcp-app" });
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
    McpAppBridge.resetInstance();
    McpAppAdaptor.resetInstance();
    localStorage.clear();
  });

  it("should persist state to localStorage when viewUUID is available", async () => {
    const viewUUID = "test-uuid-123";
    const { result } = renderHook(() => useWidgetState({ page: 1, zoom: 100 }));

    await act(async () => {
      fireToolResultNotification({
        content: [{ type: "text", text: "result" }],
        structuredContent: {},
        _meta: { viewUUID },
      });
    });

    act(() => {
      result.current[1]({ page: 3, zoom: 150 });
    });

    expect(result.current[0]).toEqual({ page: 3, zoom: 150 });
    expect(localStorage.getItem(viewUUID)).toBe(
      JSON.stringify({ page: 3, zoom: 150 }),
    );
  });

  it("should restore state from localStorage when viewUUID arrives", async () => {
    const viewUUID = "test-uuid-456";
    localStorage.setItem(viewUUID, JSON.stringify({ page: 5, zoom: 200 }));

    const { result } = renderHook(() => useWidgetState({ page: 1, zoom: 100 }));

    act(() => {
      fireToolResultNotification({
        content: [{ type: "text", text: "result" }],
        structuredContent: {},
        _meta: { viewUUID },
      });
    });

    await waitFor(() => {
      expect(result.current[0]).toEqual({ page: 5, zoom: 200 });
    });
  });

  it("should not persist when no viewUUID is available", () => {
    const { result } = renderHook(() => useWidgetState({ page: 1 }));

    act(() => {
      result.current[1]({ page: 2 });
    });

    expect(result.current[0]).toEqual({ page: 2 });
    expect(localStorage.length).toBe(0);
  });

  it("should handle corrupted localStorage data gracefully", async () => {
    const viewUUID = "test-uuid-corrupt";
    localStorage.setItem(viewUUID, "not valid json{{{");

    const { result } = renderHook(() => useWidgetState({ page: 1 }));

    act(() => {
      fireToolResultNotification({
        content: [{ type: "text", text: "result" }],
        structuredContent: {},
        _meta: { viewUUID },
      });
    });

    await waitFor(() => {
      // Should keep default state when localStorage data is corrupted
      expect(result.current[0]).toEqual({ page: 1 });
    });
  });
});
