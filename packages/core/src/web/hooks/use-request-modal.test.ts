import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRequestModal } from "./use-request-modal.js";

describe("useRequestModal", () => {
  let requestModalMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    requestModalMock = vi.fn();
    vi.stubGlobal("skybridge", { hostType: "apps-sdk" });
    vi.stubGlobal("openai", {
      requestModal: requestModalMock,
      view: { mode: "inline" },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it("should return an object with open, isOpen, and params properties where isOpen is false when mode is not modal", () => {
    const { result } = renderHook(() => useRequestModal());

    expect(typeof result.current).toBe("object");
    expect(result.current).toHaveProperty("open");
    expect(result.current).toHaveProperty("isOpen");
    expect(result.current).toHaveProperty("params");

    const { open, isOpen, params } = result.current;
    expect(typeof open).toBe("function");
    expect(isOpen).toBe(false);
    expect(params).toBeUndefined();
  });

  it("should return isOpen as true when mode is modal", () => {
    vi.stubGlobal("openai", {
      requestModal: requestModalMock,
      view: { mode: "modal" },
    });

    const { result } = renderHook(() => useRequestModal());
    const { isOpen } = result.current;

    expect(isOpen).toBe(true);
  });

  it("should return params from view when available", () => {
    const testParams = { foo: "bar", baz: 42 };
    vi.stubGlobal("openai", {
      requestModal: requestModalMock,
      view: { mode: "modal", params: testParams },
    });

    const { result } = renderHook(() => useRequestModal());
    const { params } = result.current;

    expect(params).toEqual(testParams);
  });

  it("should call window.openai.requestModal with the options when open is called", () => {
    const { result } = renderHook(() => useRequestModal());
    const { open } = result.current;

    const options = { title: "Test Modal" };
    open(options);

    expect(requestModalMock).toHaveBeenCalledTimes(1);
    expect(requestModalMock).toHaveBeenCalledWith(options);
  });
});
