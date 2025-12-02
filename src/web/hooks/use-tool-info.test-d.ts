import { expectTypeOf, test } from "vitest";
import { renderHook } from "@testing-library/react";
import { useToolInfo } from "./use-tool-info.js";

test("useToolInfo - TypeScript typing", () => {
  test("should have correct types when no generic parameter is provided", () => {
    const result = useToolInfo();

    expectTypeOf<"pending" | "success">(result.status);
    expectTypeOf<boolean>(result.isPending);
    expectTypeOf<boolean>(result.isSuccess);
    expectTypeOf<Record<string, unknown>>(result.input);
  });

  test("should correctly type input, output, and responseMetadata with explicit ToolSignature", () => {
    type TestInput = { name: string; args: { name: string } };
    type TestOutput = { name: string; color: string };
    type TestMetadata = { id: number };

    const result = useToolInfo<{
      input: TestInput;
      output: TestOutput;
      responseMetadata: TestMetadata;
    }>();

    expectTypeOf<TestInput>(result.input);

    // When pending, output and responseMetadata should be undefined
    if (result.status === "pending") {
      expectTypeOf<undefined>(result.output);
      expectTypeOf<undefined>(result.responseMetadata);
    }

    // When success, output and responseMetadata should be defined
    if (result.status === "success") {
      expectTypeOf<TestOutput>(result.output);
      expectTypeOf<TestMetadata>(result.responseMetadata);
    }
  });

  test("should correctly narrow types based on status discriminated union", () => {
    type TestInput = { query: string };
    type TestOutput = { result: string };
    type TestMetadata = { timestamp: number };

    const result = useToolInfo<{
      input: TestInput;
      output: TestOutput;
      responseMetadata: TestMetadata;
    }>();

    // Test type narrowing
    if (result.isPending) {
      expectTypeOf<"pending">(result.status);
      expectTypeOf<true>(result.isPending);
      expectTypeOf<false>(result.isSuccess);
      expectTypeOf<undefined>(result.output);
      expectTypeOf<undefined>(result.responseMetadata);
    }

    if (result.isSuccess) {
      expectTypeOf<"success">(result.status);
      expectTypeOf<false>(result.isPending);
      expectTypeOf<true>(result.isSuccess);
      expectTypeOf<TestOutput>(result.output);
      expectTypeOf<TestMetadata>(result.responseMetadata);
    }

    if (result.status === "pending") {
      expectTypeOf<TestInput>(result.input);
      expectTypeOf<true>(result.isPending);
      expectTypeOf<false>(result.isSuccess);
      expectTypeOf<undefined>(result.output);
      expectTypeOf<undefined>(result.responseMetadata);
    }

    if (result.status === "success") {
      expectTypeOf<TestInput>(result.input);
      expectTypeOf<false>(result.isPending);
      expectTypeOf<true>(result.isSuccess);
      expectTypeOf<TestOutput>(result.output);
      expectTypeOf<TestMetadata>(result.responseMetadata);
    }
  });

  test("should handle partial ToolSignature with only input specified", () => {
    type TestInput = { id: number };

    const result = useToolInfo<{
      input: TestInput;
    }>();

    expectTypeOf<TestInput>(result.input);

    if (result.status === "success") {
      expectTypeOf<Record<string, unknown>>(result.output);
      expectTypeOf<Record<string, unknown>>(result.responseMetadata);
    }
  });

  test("should handle ToolSignature with only output specified", () => {
    type TestOutput = { data: string[] };

    const result = useToolInfo<{
      output: TestOutput;
    }>();

    expectTypeOf<Record<string, unknown>>(result.input);

    if (result.status === "success") {
      expectTypeOf<TestOutput>(result.output);
    }
  });
});
