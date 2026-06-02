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

import { AppsSdkBridge } from "../bridges/apps-sdk/bridge.js";
import { _resetAdaptor, getAdaptor } from "../bridges/get-adaptor.js";
import { McpAppBridge } from "../bridges/mcp-app/bridge.js";
import type { CallToolResponse } from "../bridges/types.js";
import { useCallTool } from "./use-call-tool.js";

describe("useCallTool - onSuccess callback", () => {
  let callToolMock: Mock;

  beforeEach(() => {
    _resetAdaptor();
    McpAppBridge.resetInstance();
    AppsSdkBridge.resetInstance();
    vi.stubGlobal("parent", { postMessage: vi.fn() });
    vi.stubGlobal("skybridge", { hostType: "apps-sdk" });
    vi.stubGlobal("openai", { callTool: vi.fn() });
    callToolMock = vi.spyOn(getAdaptor(), "callTool") as unknown as Mock;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
    _resetAdaptor();
    McpAppBridge.resetInstance();
    AppsSdkBridge.resetInstance();
  });

  const toolName = "test-tool";
  const args = { input: "test input" };
  const data: CallToolResponse = {
    content: [{ type: "text" as const, text: "test result" }],
    structuredContent: { result: "test" },
    isError: false,
    meta: {},
  };
  const error = new Error("test error");

  it("should normalize _meta to meta when SDK returns _meta instead of meta", async () => {
    const rawSdkResponse = {
      content: [{ type: "text" as const, text: "result" }],
      structuredContent: { value: 1 },
      isError: false,
      meta: { secret: "only visible to widget" },
    };
    callToolMock.mockResolvedValueOnce(rawSdkResponse);
    const { result } = renderHook(() =>
      useCallTool<typeof args, typeof data>(toolName),
    );

    await act(async () => {
      result.current.callTool(args);
    });

    await waitFor(() => {
      expect(result.current.data).toMatchObject({
        meta: { secret: "only visible to widget" },
      });
    });
  });

  it("should call adaptor.callTool with correct arguments", async () => {
    const { result } = renderHook(() =>
      useCallTool<typeof args, typeof data>(toolName),
    );
    await act(async () => {
      result.current.callTool(args);
    });
    expect(callToolMock).toHaveBeenCalledWith(toolName, args);
  });

  it("should call onSuccess callback with correct data and toolArgs on successful execution", async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    callToolMock.mockResolvedValueOnce(data);
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
    callToolMock.mockRejectedValueOnce(error);
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
    callToolMock.mockResolvedValueOnce(data);
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
    callToolMock.mockRejectedValueOnce(error);
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

  it("should always return last call started state", async () => {
    const { result } = renderHook(() =>
      useCallTool<typeof args, typeof data>(toolName),
    );

    const firstCallData = {
      ...data,
      structuredContent: { result: "first call result" },
    };
    const secondCallData = {
      ...data,
      structuredContent: { result: "second call result" },
    };
    const { promise: firstCallToolPromise, resolve: resolveFirstCallTool } =
      Promise.withResolvers();
    const { promise: secondCallToolPromise, resolve: resolveSecondCallTool } =
      Promise.withResolvers();
    callToolMock
      .mockImplementationOnce(() => firstCallToolPromise)
      .mockImplementationOnce(() => secondCallToolPromise);

    await act(() => {
      result.current.callTool(args);
      result.current.callTool(args);
      resolveFirstCallTool(firstCallData);
      return firstCallToolPromise;
    });

    expect(result.current.status).toEqual("pending");
    expect(result.current.data).toEqual(undefined);
    resolveSecondCallTool(secondCallData);

    await waitFor(() => {
      expect(result.current.status).toEqual("success");
      expect(result.current.data).toEqual(secondCallData);
    });
  });
});

describe("useCallTool - TypeScript typing", () => {
  let callToolMock: Mock;

  beforeEach(() => {
    _resetAdaptor();
    McpAppBridge.resetInstance();
    AppsSdkBridge.resetInstance();
    vi.stubGlobal("parent", { postMessage: vi.fn() });
    vi.stubGlobal("skybridge", { hostType: "apps-sdk" });
    vi.stubGlobal("openai", { callTool: vi.fn() });
    callToolMock = vi.spyOn(getAdaptor(), "callTool") as unknown as Mock;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
    _resetAdaptor();
    McpAppBridge.resetInstance();
    AppsSdkBridge.resetInstance();
  });

  it("should have correct return types when ToolArgs is null and ToolResponse is specified", async () => {
    type TestResponse = CallToolResponse & {
      structuredContent: { result: string };
      meta: { id: number };
    };

    const { result } = renderHook(() =>
      useCallTool<null, TestResponse>("test-tool"),
    );
    const data: TestResponse = {
      content: [{ type: "text" as const, text: "test" }],
      structuredContent: { result: "test" },
      isError: false,
      meta: { id: 123 },
    };

    callToolMock.mockResolvedValueOnce(data);

    await act(async () => {
      result.current.callTool();
    });

    expect(callToolMock).toHaveBeenCalledWith("test-tool", null);
    expectTypeOf<typeof data | undefined>(result.current.data);
  });

  it("should correctly type callToolAsync return value", async () => {
    type TestArgs = { query: string };
    type TestResponse = CallToolResponse & {
      structuredContent: { answer: string };
    };

    const { result } = renderHook(() =>
      useCallTool<TestArgs, TestResponse>("test-tool"),
    );

    const testArgs: TestArgs = { query: "test" };
    const mockResponse: TestResponse = {
      content: [{ type: "text" as const, text: "answer" }],
      structuredContent: { answer: "test answer" },
      isError: false,
      meta: {},
    };

    callToolMock.mockResolvedValueOnce(mockResponse);

    const returnedValue = await act(async () => {
      return result.current.callToolAsync(testArgs);
    });
    expectTypeOf<typeof mockResponse>(returnedValue);
    expect(returnedValue).toEqual(mockResponse);
  });

  it("should correctly type callToolAsync when ToolArgs is null", async () => {
    type TestResponse = CallToolResponse & {
      structuredContent: { data: string };
    };

    const { result } = renderHook(() =>
      useCallTool<null, TestResponse>("test-tool"),
    );

    const mockResponse: TestResponse = {
      content: [{ type: "text" as const, text: "data" }],
      structuredContent: { data: "test data" },
      isError: false,
      meta: {},
    };

    callToolMock.mockResolvedValueOnce(mockResponse);

    const returnedValue = await act(async () => {
      return result.current.callToolAsync();
    });
    expectTypeOf<typeof mockResponse>(returnedValue);
    expect(returnedValue).toEqual(mockResponse);
  });
});
