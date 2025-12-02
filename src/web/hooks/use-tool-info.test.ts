import { fireEvent, renderHook, waitFor, act } from "@testing-library/react";
import { expectType } from "tsd";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

    expectType<"pending" | "success">(result.current.status);
    expectType<boolean>(result.current.isPending);
    expectType<boolean>(result.current.isSuccess);
    expectType<Record<string, unknown>>(result.current.input);
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

    expectType<TestInput>(result.current.input);

    // When pending, output and responseMetadata should be undefined
    if (result.current.status === "pending") {
      expectType<undefined>(result.current.output);
      expectType<undefined>(result.current.responseMetadata);
      expectType<true>(result.current.isPending);
      expectType<false>(result.current.isSuccess);
    }

    // When success, output and responseMetadata should be defined
    if (result.current.status === "success") {
      expectType<TestOutput>(result.current.output);
      expectType<TestMetadata>(result.current.responseMetadata);
      expectType<false>(result.current.isPending);
      expectType<true>(result.current.isSuccess);
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
      expectType<"pending">(result.current.status);
      expectType<true>(result.current.isPending);
      expectType<false>(result.current.isSuccess);
      expectType<undefined>(result.current.output);
      expectType<undefined>(result.current.responseMetadata);
    }

    if (result.current.isSuccess) {
      expectType<"success">(result.current.status);
      expectType<false>(result.current.isPending);
      expectType<true>(result.current.isSuccess);
      expectType<TestOutput>(result.current.output);
      expectType<TestMetadata>(result.current.responseMetadata);
    }

    if (result.current.status === "pending") {
      expectType<TestInput>(result.current.input);
      expectType<true>(result.current.isPending);
      expectType<false>(result.current.isSuccess);
      expectType<undefined>(result.current.output);
      expectType<undefined>(result.current.responseMetadata);
    }

    if (result.current.status === "success") {
      expectType<TestInput>(result.current.input);
      expectType<false>(result.current.isPending);
      expectType<true>(result.current.isSuccess);
      expectType<TestOutput>(result.current.output);
      expectType<TestMetadata>(result.current.responseMetadata);
    }
  });

  it("should handle partial ToolSignature with only input specified", () => {
    type TestInput = { id: number };

    const { result } = renderHook(() =>
      useToolInfo<{
        input: TestInput;
      }>()
    );

    expectType<TestInput>(result.current.input);

    if (result.current.status === "success") {
      expectType<Record<string, unknown>>(result.current.output);
      expectType<Record<string, unknown>>(result.current.responseMetadata);
    }
  });

  it("should handle ToolSignature with only output specified", () => {
    type TestOutput = { data: string[] };

    const { result } = renderHook(() =>
      useToolInfo<{
        output: TestOutput;
      }>()
    );

    expectType<Record<string, unknown>>(result.current.input);

    if (result.current.status === "success") {
      expectType<TestOutput>(result.current.output);
    }
  });
});
