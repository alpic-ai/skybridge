import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserAgent } from "../types.js";
import { useUser } from "./use-user.js";

describe("useUser", () => {
  let OpenaiMock: {
    locale: string;
    userAgent: UserAgent;
  };

  beforeEach(() => {
    OpenaiMock = {
      locale: "en-US",
      userAgent: {
        device: { type: "desktop" },
        capabilities: { hover: true, touch: false },
      },
    };
    vi.stubGlobal("openai", OpenaiMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it("should return locale and userAgent from window.openai", () => {
    const { result } = renderHook(() => useUser());

    expect(result.current.locale).toBe("en-US");
    expect(result.current.userAgent).toEqual({
      device: { type: "desktop" },
      capabilities: { hover: true, touch: false },
    });
  });

  it("should return mobile userAgent when set to mobile", () => {
    OpenaiMock.userAgent = {
      device: { type: "mobile" },
      capabilities: { hover: false, touch: true },
    };
    const { result } = renderHook(() => useUser());

    expect(result.current.userAgent.device.type).toBe("mobile");
    expect(result.current.userAgent.capabilities.touch).toBe(true);
  });

  it("should return different locale when set", () => {
    OpenaiMock.locale = "es-ES";
    const { result } = renderHook(() => useUser());

    expect(result.current.locale).toBe("es-ES");
  });
});
