import { expectTypeOf, test } from "vitest";
import { useCallTool, type CallToolState, type SideEffects } from "./use-call-tool.js";
import type { CallToolResponse } from "../types.js";

test("callTool can be called without args when ToolArgs is null", () => {
  const { callTool, callToolAsync } = useCallTool<null>("test-tool");
  callTool();
  callTool({ onSuccess: () => {} });
  callToolAsync();
});

test("callTool requires args when ToolArgs has required properties", () => {
  type Args = { query: string };
  const { callTool, callToolAsync } = useCallTool<Args>("test-tool");

  // @ts-expect-error - query is required
  callTool();

  callTool({ query: "test" });
  callTool({ query: "test" }, { onSuccess: () => {} });

  // @ts-expect-error - query is required
  callToolAsync();
  callToolAsync({ query: "test" });
});

test("callTool supports sideEffects with correct types", () => {
  type Args = { id: number };
  type Response = { structuredContent: { result: string } };

  const { callTool } = useCallTool<Args, Response>("test-tool");

  callTool({ id: 1 }, {
    onSuccess: (data, args) => {
      expectTypeOf(data.structuredContent.result).toBeString();
      expectTypeOf(args.id).toBeNumber();
    },
    onError: (error, args) => {
      expectTypeOf(error).toBeUnknown();
      expectTypeOf(args.id).toBeNumber();
    },
    onSettled: (data, error, args) => {
      if (data) {
        expectTypeOf(data.structuredContent.result).toBeString();
      }
      expectTypeOf(error).toEqualTypeOf<unknown | undefined>();
      expectTypeOf(args.id).toBeNumber();
    },
  });
});

test("callTool allows sideEffects as first arg when ToolArgs is null", () => {
  type Response = { structuredContent: { value: number } };
  const { callTool } = useCallTool<null, Response>("test-tool");

  callTool({
    onSuccess: (data) => {
      expectTypeOf(data.structuredContent.value).toBeNumber();
    },
  });
});

test("callToolAsync returns correctly typed promise", () => {
  type Args = { name: string };
  type Response = { structuredContent: { greeting: string }; meta: { id: number } };

  const { callToolAsync } = useCallTool<Args, Response>("test-tool");

  const promise = callToolAsync({ name: "test" });

  expectTypeOf(promise).resolves.toHaveProperty("structuredContent");
  expectTypeOf(promise).resolves.toHaveProperty("meta");
});

test("state narrowing works correctly with status", () => {
  type Response = { structuredContent: { data: string } };
  const result = useCallTool<null, Response>("test-tool");

  if (result.status === "idle") {
    expectTypeOf(result.isIdle).toEqualTypeOf<true>();
    expectTypeOf(result.data).toEqualTypeOf<undefined>();
  }

  if (result.status === "pending") {
    expectTypeOf(result.isPending).toEqualTypeOf<true>();
    expectTypeOf(result.data).toEqualTypeOf<undefined>();
  }

  if (result.status === "success") {
    expectTypeOf(result.isSuccess).toEqualTypeOf<true>();
    expectTypeOf(result.data).not.toEqualTypeOf<undefined>();
    expectTypeOf(result.data.structuredContent.data).toBeString();
  }

  if (result.status === "error") {
    expectTypeOf(result.isError).toEqualTypeOf<true>();
    expectTypeOf(result.error).toBeUnknown();
  }
});

test("state narrowing works correctly with boolean flags", () => {
  type Response = { structuredContent: { items: string[] } };
  const result = useCallTool<null, Response>("test-tool");

  if (result.isIdle) {
    expectTypeOf(result.status).toEqualTypeOf<"idle">();
  }

  if (result.isPending) {
    expectTypeOf(result.status).toEqualTypeOf<"pending">();
  }

  if (result.isSuccess) {
    expectTypeOf(result.status).toEqualTypeOf<"success">();
    expectTypeOf(result.data.structuredContent.items).toBeArray();
  }

  if (result.isError) {
    expectTypeOf(result.status).toEqualTypeOf<"error">();
  }
});

test("CallToolState type is correctly exported and usable", () => {
  type Response = { structuredContent: { foo: string } };
  type MyState = CallToolState<CallToolResponse & Response>;

  const state: MyState = {} as MyState;

  if (state.status === "success") {
    expectTypeOf(state.data.structuredContent.foo).toBeString();
  }
});

test("SideEffects type is correctly exported and usable", () => {
  type Args = { x: number };
  type Response = CallToolResponse & { structuredContent: { y: string } };

  const sideEffects: SideEffects<Args, Response> = {
    onSuccess: (data, args) => {
      expectTypeOf(data.structuredContent.y).toBeString();
      expectTypeOf(args.x).toBeNumber();
    },
  };

  expectTypeOf(sideEffects).toHaveProperty("onSuccess");
});

