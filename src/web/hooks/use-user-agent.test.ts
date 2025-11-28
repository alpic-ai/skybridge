import { useUserAgent } from "./use-user-agent.js";
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from "vitest";
import { renderHook } from "@testing-library/react";
import type { UserAgent } from "../types.js";

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
