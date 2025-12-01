import { useCallTool } from "./use-call-tool.js";
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

describe("useCallTool - onSuccess callback", () => {
  let OpenaiMock: { callTool: Mock };

  beforeEach(() => {
    OpenaiMock = {
      callTool: vi.fn(),
    };
    vi.stubGlobal("openai", OpenaiMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  const toolName = "test-tool";
  const args = { input: "test input" };
  const data = {
    content: [{ type: "text" as const, text: "test result" }],
    structuredContent: { result: "test" },
    isError: false,
    result: "test result",
    meta: {},
  };
  const error = new Error("test error");

  it("should call window.openai.callTool with correct arguments", async () => {
    const { result } = renderHook(() =>
      useCallTool<typeof args, typeof data>(toolName)
    );
    act(() => {
      result.current.callTool(args);
    });
    expect(OpenaiMock.callTool).toHaveBeenCalledWith(toolName, args);
  });

  it("should call onSuccess callback with correct data and toolArgs on successful execution", async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    OpenaiMock.callTool.mockResolvedValueOnce(data);
    const { result } = renderHook(() =>
      useCallTool<typeof args, typeof data>(toolName)
    );

    act(() => {
      result.current.callTool(args, {
        onSuccess,
        onError,
      });
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(data, args);
      expect(onError).not.toHaveBeenCalled();
    });
  });

  it("should call onError callback with error and toolArgs on failed execution", async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    OpenaiMock.callTool.mockRejectedValueOnce(error);
    const { result } = renderHook(() =>
      useCallTool<typeof args, typeof data>(toolName)
    );

    act(() => {
      result.current.callTool(args, {
        onSuccess,
        onError,
      });
    });

    await waitFor(() => {
      expect(onSuccess).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(error, args);
    });
  });

  it("should call onSettled callback with data and undefined error on successful execution", async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const onSettled = vi.fn();
    OpenaiMock.callTool.mockResolvedValueOnce(data);
    const { result } = renderHook(() =>
      useCallTool<typeof args, typeof data>(toolName)
    );

    act(() => {
      result.current.callTool(args, {
        onSuccess,
        onError,
        onSettled,
      });
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(data, args);
      expect(onSettled).toHaveBeenCalledWith(data, undefined, args);
      expect(onError).not.toHaveBeenCalled();
    });
  });

  it("should call onSettled callback with undefined data and error on failed execution", async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const onSettled = vi.fn();
    OpenaiMock.callTool.mockRejectedValueOnce(error);
    const { result } = renderHook(() =>
      useCallTool<typeof args, typeof data>(toolName)
    );

    act(() => {
      result.current.callTool(args, {
        onSuccess,
        onError,
        onSettled,
      });
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(error, args);
      expect(onSettled).toHaveBeenCalledWith(undefined, error, args);
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });
});
