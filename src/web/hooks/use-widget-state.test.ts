import { act, renderHook } from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from "vitest";
import { useWidgetState } from "./use-widget-state.js";

describe("useWidgetState", () => {
  let OpenaiMock: { widgetState: unknown; setWidgetState: Mock };

  beforeEach(() => {
    OpenaiMock = {
      widgetState: null,
      setWidgetState: vi.fn().mockResolvedValue(undefined),
    };
    vi.stubGlobal("openai", OpenaiMock);
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
    OpenaiMock.widgetState = windowState;
    const { result } = renderHook(() => useWidgetState(defaultState));

    expect(result.current[0]).toEqual(windowState);
  });

  it("should call window.openai.setWidgetState when setWidgetState is called with a new state", async () => {
    const { result } = renderHook(() => useWidgetState(defaultState));
    const newState = { count: 10, name: "updated" };

    act(() => {
      result.current[1](newState);
    });

    expect(OpenaiMock.setWidgetState).toHaveBeenCalledWith(newState);
    expect(result.current[0]).toEqual(newState);
  });

  it("should call window.openai.setWidgetState when setWidgetState is called with a function updater", async () => {
    const { result } = renderHook(() => useWidgetState(defaultState));

    act(() => {
      result.current[1]((prev) => ({ ...prev, count: prev.count + 1 }));
    });

    expect(OpenaiMock.setWidgetState).toHaveBeenCalledWith({
      count: 1,
      name: "test",
    });
    expect(result.current[0]).toEqual({ count: 1, name: "test" });
  });

  it("should update state when window.openai.widgetState changes", () => {
    OpenaiMock.widgetState = defaultState;
    const { result, rerender } = renderHook(() => useWidgetState(defaultState));

    expect(result.current[0]).toEqual(defaultState);

    // Simulate window.openai.widgetState changing
    OpenaiMock.widgetState = windowState;
    // Trigger re-render to simulate the useEffect running
    rerender();

    expect(result.current[0]).toEqual(windowState);
  });
});
