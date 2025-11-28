import { useRequestModal } from "./use-request-modal.js";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";

describe("useRequestModal", () => {
  let requestModalMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    requestModalMock = vi.fn();
    vi.stubGlobal("openai", {
      requestModal: requestModalMock,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it("should return a function that calls window.openai.requestModal with the options", () => {
    const { result } = renderHook(() => useRequestModal());

    const options = { title: "Test Modal" };
    result.current(options);

    expect(requestModalMock).toHaveBeenCalledTimes(1);
    expect(requestModalMock).toHaveBeenCalledWith(options);
  });
});
