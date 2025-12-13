import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRequestModal } from "./use-request-modal.js";

describe("useRequestModal", () => {
  let requestModalMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    requestModalMock = vi.fn();
    vi.stubGlobal("openai", {
      requestModal: requestModalMock,
      displayMode: "inline",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it("should return an array with [open, isOpen] where isOpen is false when displayMode is not modal", () => {
    const { result } = renderHook(() => useRequestModal());

    expect(Array.isArray(result.current)).toBe(true);
    expect(result.current).toHaveLength(2);

    const [open, isOpen] = result.current;
    expect(typeof open).toBe("function");
    expect(isOpen).toBe(false);
  });

  it("should return isOpen as true when displayMode is modal", () => {
    vi.stubGlobal("openai", {
      requestModal: requestModalMock,
      displayMode: "modal",
    });

    const { result } = renderHook(() => useRequestModal());
    const [, isOpen] = result.current;

    expect(isOpen).toBe(true);
  });

  it("should call window.openai.requestModal with the options when open is called", () => {
    const { result } = renderHook(() => useRequestModal());
    const [open] = result.current;

    const options = { title: "Test Modal" };
    open(options);

    expect(requestModalMock).toHaveBeenCalledTimes(1);
    expect(requestModalMock).toHaveBeenCalledWith(options);
  });
});
