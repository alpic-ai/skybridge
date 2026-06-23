import { expectTypeOf, test } from "vitest";
import { useToolInfo } from "./use-tool-info.js";

test("useToolInfo - TypeScript typing", () => {
  test("should have correct types when no generic parameter is provided", () => {
    const result = useToolInfo();

    expectTypeOf<"idle" | "pending" | "success">(result.status);
    expectTypeOf<boolean>(result.isPending);
    expectTypeOf<boolean>(result.isSuccess);
    expectTypeOf<boolean>(result.isIdle);
    expectTypeOf<Record<string, unknown> | undefined>(result.input);
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

    // When pending, input may be undefined (host hasn't delivered args yet,
    // or the tool has no input schema)
    if (result.status === "pending") {
      expectTypeOf<TestInput | undefined>(result.input);
      expectTypeOf<undefined>(result.output);
      expectTypeOf<undefined>(result.responseMetadata);
    }

    // When success, output and responseMetadata are defined; input may still
    // be undefined if the host hasn't surfaced the tool arguments
    if (result.status === "success") {
      expectTypeOf<TestInput | undefined>(result.input);
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

    // Test type narrowing for pending
    if (result.isPending) {
      expectTypeOf<"pending">(result.status);
      expectTypeOf<false>(result.isIdle);
      expectTypeOf<true>(result.isPending);
      expectTypeOf<false>(result.isSuccess);
      expectTypeOf<TestInput | undefined>(result.input);
      expectTypeOf<undefined>(result.output);
      expectTypeOf<undefined>(result.responseMetadata);
    }

    if (result.isSuccess) {
      expectTypeOf<"success">(result.status);
      expectTypeOf<false>(result.isIdle);
      expectTypeOf<false>(result.isPending);
      expectTypeOf<true>(result.isSuccess);
      expectTypeOf<TestInput | undefined>(result.input);
      expectTypeOf<TestOutput>(result.output);
      expectTypeOf<TestMetadata>(result.responseMetadata);
    }

    if (result.status === "pending") {
      expectTypeOf<TestInput | undefined>(result.input);
      expectTypeOf<false>(result.isIdle);
      expectTypeOf<true>(result.isPending);
      expectTypeOf<false>(result.isSuccess);
      expectTypeOf<undefined>(result.output);
      expectTypeOf<undefined>(result.responseMetadata);
    }

    if (result.status === "success") {
      expectTypeOf<TestInput | undefined>(result.input);
      expectTypeOf<false>(result.isIdle);
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

    // Input is optional in both states — undefined while args haven't arrived
    // (pending) and for no-input tools (success).
    if (result.status === "pending") {
      expectTypeOf<TestInput | undefined>(result.input);
    }

    if (result.status === "success") {
      expectTypeOf<TestInput | undefined>(result.input);
      expectTypeOf<Record<string, unknown>>(result.output);
      expectTypeOf<Record<string, unknown>>(result.responseMetadata);
    }
  });

  test("should handle ToolSignature with only output specified", () => {
    type TestOutput = { data: string[] };

    const result = useToolInfo<{
      output: TestOutput;
    }>();

    if (result.status === "pending") {
      expectTypeOf<Record<string, unknown> | undefined>(result.input);
    }

    if (result.status === "success") {
      expectTypeOf<Record<string, unknown> | undefined>(result.input);
      expectTypeOf<TestOutput>(result.output);
    }
  });
});
