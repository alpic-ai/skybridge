import { act, renderHook, waitFor } from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  expectTypeOf,
  it,
  type Mock,
  vi,
} from "vitest";
import { useCallTool } from "./use-call-tool.js";

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
      useCallTool<typeof args, typeof data>(toolName),
    );
    await act(async () => {
      result.current.callTool(args);
    });
    expect(OpenaiMock.callTool).toHaveBeenCalledWith(toolName, args);
  });

  it("should call onSuccess callback with correct data and toolArgs on successful execution", async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    OpenaiMock.callTool.mockResolvedValueOnce(data);
    const { result } = renderHook(() =>
      useCallTool<typeof args, typeof data>(toolName),
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
      useCallTool<typeof args, typeof data>(toolName),
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
      useCallTool<typeof args, typeof data>(toolName),
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
      useCallTool<typeof args, typeof data>(toolName),
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

describe("useCallTool - TypeScript typing", () => {
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

  it("should have correct return types when ToolArgs is null and ToolResponse is specified", async () => {
    type TestResponse = {
      structuredContent: { result: string };
      meta: { id: number };
    };

    const { result } = renderHook(() =>
      useCallTool<null, TestResponse>("test-tool"),
    );
    const data = {
      content: [{ type: "text" as const, text: "test" }],
      structuredContent: { result: "test" },
      isError: false,
      result: "test",
      meta: { id: 123 },
    };

    OpenaiMock.callTool.mockResolvedValueOnce(data);

    await act(async () => {
      result.current.callTool();
    });

    expect(OpenaiMock.callTool).toHaveBeenCalledWith("test-tool", null);
    expectTypeOf<typeof data | undefined>(result.current.data);
  });

  it("should correctly type callToolAsync return value", async () => {
    type TestArgs = { query: string };
    type TestResponse = {
      structuredContent: { answer: string };
    };

    const { result } = renderHook(() =>
      useCallTool<TestArgs, TestResponse>("test-tool"),
    );

    const testArgs: TestArgs = { query: "test" };
    const mockResponse = {
      content: [{ type: "text" as const, text: "answer" }],
      structuredContent: { answer: "test answer" },
      isError: false,
      result: "answer",
      meta: {},
    };

    OpenaiMock.callTool.mockResolvedValueOnce(mockResponse);

    let promise: Promise<typeof mockResponse>;
    let resolvedValue: typeof mockResponse;
    await act(async () => {
      promise = result.current.callToolAsync(testArgs);
      expectTypeOf<Promise<typeof mockResponse>>(promise);
      resolvedValue = await promise;
    });

    expect(resolvedValue!).toEqual(mockResponse);
  });

  it("should correctly type callToolAsync when ToolArgs is null", async () => {
    type TestResponse = {
      structuredContent: { data: string };
    };

    const { result } = renderHook(() =>
      useCallTool<null, TestResponse>("test-tool"),
    );

    const mockResponse: TestResponse & {
      content: Array<{ type: "text"; text: string }>;
      isError: boolean;
      result: string;
    } = {
      content: [{ type: "text" as const, text: "data" }],
      structuredContent: { data: "test data" },
      isError: false,
      result: "data",
    };

    OpenaiMock.callTool.mockResolvedValueOnce(mockResponse);

    let promise: Promise<typeof mockResponse>;
    let resolvedValue: typeof mockResponse;
    await act(async () => {
      promise = result.current.callToolAsync();
      expectTypeOf<Promise<typeof mockResponse>>(promise);
      resolvedValue = await promise;
    });

    expect(resolvedValue!).toEqual(mockResponse);
  });
});
