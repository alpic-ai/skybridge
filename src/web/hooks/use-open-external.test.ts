import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useOpenExternal } from "./use-open-external.js";

describe("useOpenExternal", () => {
  let openExternalMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    openExternalMock = vi.fn();
    vi.stubGlobal("openai", {
      openExternal: openExternalMock,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it("should return a function that calls window.openai.openExternal with the href", () => {
    const { result } = renderHook(() => useOpenExternal());

    const href = "https://example.com";
    result.current(href);

    expect(openExternalMock).toHaveBeenCalledTimes(1);
    expect(openExternalMock).toHaveBeenCalledWith({ href });
  });
});
