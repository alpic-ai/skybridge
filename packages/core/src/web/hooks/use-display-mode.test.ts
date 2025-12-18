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
import type { DisplayMode } from "../types.js";
import { useDisplayMode } from "./use-display-mode.js";

describe("useDisplayMode", () => {
  let OpenaiMock: {
    displayMode: DisplayMode;
    requestDisplayMode: Mock;
  };

  beforeEach(() => {
    OpenaiMock = {
      displayMode: "inline",
      requestDisplayMode: vi.fn().mockResolvedValue({ mode: "inline" }),
    };
    vi.stubGlobal("openai", OpenaiMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it("should return the current display mode from window.openai.displayMode", () => {
    OpenaiMock.displayMode = "inline";
    const { result } = renderHook(() => useDisplayMode());

    expect(result.current[0]).toBe("inline");
  });

  it("should return different display modes when window.openai.displayMode changes", () => {
    OpenaiMock.displayMode = "inline";
    const { result, rerender } = renderHook(() => useDisplayMode());

    expect(result.current[0]).toBe("inline");

    OpenaiMock.displayMode = "fullscreen";
    rerender();

    expect(result.current[0]).toBe("fullscreen");
  });

  it("should call window.openai.requestDisplayMode with correct mode when setDisplayMode is called", async () => {
    const { result } = renderHook(() => useDisplayMode());

    await act(async () => {
      await result.current[1]("fullscreen");
    });

    expect(OpenaiMock.requestDisplayMode).toHaveBeenCalledWith({
      mode: "fullscreen",
    });
  });
});
