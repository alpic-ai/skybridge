import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLocale } from "./use-locale.js";

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
