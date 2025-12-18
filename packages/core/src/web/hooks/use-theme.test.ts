import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTheme } from "./use-theme.js";

describe("useTheme", () => {
  let OpenaiMock: {
    theme: "light" | "dark";
  };

  beforeEach(() => {
    OpenaiMock = {
      theme: "light",
    };
    vi.stubGlobal("openai", OpenaiMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it("should return the current theme from window.openai.theme", () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current).toBe("light");
  });

  it("should return dark theme when set to dark", () => {
    OpenaiMock.theme = "dark";
    const { result } = renderHook(() => useTheme());

    expect(result.current).toBe("dark");
  });
});
