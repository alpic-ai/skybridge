import { useLocale } from "./use-locale.js";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";

describe("useLocale", () => {
  let OpenaiMock: {
    locale: string;
  };

  beforeEach(() => {
    OpenaiMock = {
      locale: "en-US",
    };
    vi.stubGlobal("openai", OpenaiMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it("should return the current locale from window.openai.locale", () => {
    const { result } = renderHook(() => useLocale());

    expect(result.current).toBe("en-US");
  });
});
