import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SafeArea, Theme } from "../types.js";
import { useLayout } from "./use-layout.js";

describe("useLayout", () => {
  let OpenaiMock: {
    theme: Theme;
    maxHeight: number;
    safeArea: SafeArea;
  };

  beforeEach(() => {
    OpenaiMock = {
      theme: "light",
      maxHeight: 500,
      safeArea: { insets: { top: 0, bottom: 0, left: 0, right: 0 } },
    };
    vi.stubGlobal("openai", OpenaiMock);
    vi.stubGlobal("skybridge", { hostType: "chatgpt-app" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it("should return theme, maxHeight, and safeArea from window.openai", () => {
    const { result } = renderHook(() => useLayout());

    expect(result.current.theme).toBe("light");
    expect(result.current.maxHeight).toBe(500);
    expect(result.current.safeArea).toEqual({
      insets: { top: 0, bottom: 0, left: 0, right: 0 },
    });
  });

  it("should return dark theme when set to dark", () => {
    OpenaiMock.theme = "dark";
    const { result } = renderHook(() => useLayout());

    expect(result.current.theme).toBe("dark");
  });

  it("should return different maxHeight when set", () => {
    OpenaiMock.maxHeight = 800;
    const { result } = renderHook(() => useLayout());

    expect(result.current.maxHeight).toBe(800);
  });

  it("should return safeArea with insets when set", () => {
    OpenaiMock.safeArea = {
      insets: { top: 44, bottom: 34, left: 0, right: 0 },
    };
    const { result } = renderHook(() => useLayout());

    expect(result.current.safeArea.insets.top).toBe(44);
    expect(result.current.safeArea.insets.bottom).toBe(34);
  });
});
