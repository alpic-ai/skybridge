import { fireEvent, renderHook, waitFor, act } from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  expectTypeOf,
} from "vitest";
import { useToolInfo } from "./use-tool-info.js";
import {
  SET_GLOBALS_EVENT_TYPE,
  SetGlobalsEvent,
  type OpenAiGlobals,
} from "../types.js";

describe("useToolInfo", () => {
  let OpenaiMock: Pick<
    OpenAiGlobals,
    "toolInput" | "toolOutput" | "toolResponseMetadata"
  >;

  beforeEach(() => {
    OpenaiMock = {
      toolInput: { name: "pokemon", args: { name: "pikachu" } },
      toolOutput: null,
      toolResponseMetadata: null,
    };
    vi.stubGlobal("openai", OpenaiMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it("should return toolInput on initial mount window.openai", () => {
    const { result } = renderHook(() => useToolInfo());

    expect(result.current).toMatchObject({
      input: { name: "pokemon", args: { name: "pikachu" } },
      status: "pending",
      isPending: true,
      isSuccess: false,
    });
  });

  it("should eventually return tool output and response metadata once tool call completes", async () => {
    const toolOutput = {
      name: "pikachu",
      color: "yellow",
      description:
        "When several of these POKéMON gather, their\felectricity could build and cause lightning storms.",
    };
    const toolResponseMetadata = { id: 12 };
    const { result } = renderHook(() => useToolInfo());

    act(() => {
      OpenaiMock.toolOutput = toolOutput;
      OpenaiMock.toolResponseMetadata = toolResponseMetadata;
      fireEvent(
        window,
        new SetGlobalsEvent(SET_GLOBALS_EVENT_TYPE, {
          detail: {
            globals: {
              toolOutput,
              toolResponseMetadata,
            },
          },
        })
      );
    });

    await waitFor(() => {
      expect(result.current).toMatchObject({
        status: "success",
        isPending: false,
        isSuccess: true,
        output: toolOutput,
        responseMetadata: toolResponseMetadata,
      });
    });
  });
});

describe("useToolInfo - TypeScript typing", () => {
  it("should have correct types when no generic parameter is provided", () => {
    const { result } = renderHook(() => useToolInfo());

    expectTypeOf<"pending" | "success">(result.current.status);
    expectTypeOf<boolean>(result.current.isPending);
    expectTypeOf<boolean>(result.current.isSuccess);
    expectTypeOf<Record<string, unknown>>(result.current.input);
  });

  it("should correctly type input, output, and responseMetadata with explicit ToolSignature", () => {
    type TestInput = { name: string; args: { name: string } };
    type TestOutput = { name: string; color: string };
    type TestMetadata = { id: number };

    const { result } = renderHook(() =>
      useToolInfo<{
        input: TestInput;
        output: TestOutput;
        responseMetadata: TestMetadata;
      }>()
    );

    expectTypeOf<TestInput>(result.current.input);

    // When pending, output and responseMetadata should be undefined
    if (result.current.status === "pending") {
      expectTypeOf<undefined>(result.current.output);
      expectTypeOf<undefined>(result.current.responseMetadata);
      expectTypeOf<true>(result.current.isPending);
      expectTypeOf<false>(result.current.isSuccess);
    }

    // When success, output and responseMetadata should be defined
    if (result.current.status === "success") {
      expectTypeOf<TestOutput>(result.current.output);
      expectTypeOf<TestMetadata>(result.current.responseMetadata);
      expectTypeOf<false>(result.current.isPending);
      expectTypeOf<true>(result.current.isSuccess);
    }
  });

  it("should correctly narrow types based on status discriminated union", () => {
    type TestInput = { query: string };
    type TestOutput = { result: string };
    type TestMetadata = { timestamp: number };

    const { result } = renderHook(() =>
      useToolInfo<{
        input: TestInput;
        output: TestOutput;
        responseMetadata: TestMetadata;
      }>()
    );

    // Test type narrowing
    if (result.current.isPending) {
      expectTypeOf<"pending">(result.current.status);
      expectTypeOf<true>(result.current.isPending);
      expectTypeOf<false>(result.current.isSuccess);
      expectTypeOf<undefined>(result.current.output);
      expectTypeOf<undefined>(result.current.responseMetadata);
    }

    if (result.current.isSuccess) {
      expectTypeOf<"success">(result.current.status);
      expectTypeOf<false>(result.current.isPending);
      expectTypeOf<true>(result.current.isSuccess);
      expectTypeOf<TestOutput>(result.current.output);
      expectTypeOf<TestMetadata>(result.current.responseMetadata);
    }

    if (result.current.status === "pending") {
      expectTypeOf<TestInput>(result.current.input);
      expectTypeOf<true>(result.current.isPending);
      expectTypeOf<false>(result.current.isSuccess);
      expectTypeOf<undefined>(result.current.output);
      expectTypeOf<undefined>(result.current.responseMetadata);
    }

    if (result.current.status === "success") {
      expectTypeOf<TestInput>(result.current.input);
      expectTypeOf<false>(result.current.isPending);
      expectTypeOf<true>(result.current.isSuccess);
      expectTypeOf<TestOutput>(result.current.output);
      expectTypeOf<TestMetadata>(result.current.responseMetadata);
    }
  });

  it("should handle partial ToolSignature with only input specified", () => {
    type TestInput = { id: number };

    const { result } = renderHook(() =>
      useToolInfo<{
        input: TestInput;
      }>()
    );

    expectTypeOf<TestInput>(result.current.input);

    if (result.current.status === "success") {
      expectTypeOf<Record<string, unknown>>(result.current.output);
      expectTypeOf<Record<string, unknown>>(result.current.responseMetadata);
    }
  });

  it("should handle ToolSignature with only output specified", () => {
    type TestOutput = { data: string[] };

    const { result } = renderHook(() =>
      useToolInfo<{
        output: TestOutput;
      }>()
    );

    expectTypeOf<Record<string, unknown>>(result.current.input);

    if (result.current.status === "success") {
      expectTypeOf<TestOutput>(result.current.output);
    }
  });
});
