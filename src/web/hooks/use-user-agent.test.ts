import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserAgent } from "../types.js";
import { useUserAgent } from "./use-user-agent.js";

describe("useUserAgent", () => {
  let OpenaiMock: {
    userAgent: UserAgent;
  };

  beforeEach(() => {
    OpenaiMock = {
      userAgent: {
        device: { type: "mobile" },
        capabilities: { hover: false, touch: true },
      },
    };
    vi.stubGlobal("openai", OpenaiMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it("should return the current user agent from window.openai.userAgent", () => {
    OpenaiMock.userAgent = {
      device: { type: "mobile" },
      capabilities: { hover: false, touch: true },
    };
    const { result } = renderHook(() => useUserAgent());

    expect(result.current).toEqual({
      device: { type: "mobile" },
      capabilities: { hover: false, touch: true },
    });
  });
});
