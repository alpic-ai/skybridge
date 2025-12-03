import { expectTypeOf, test } from "vitest";
import { createTypedHooks } from "./typed-hooks.js";
import type { InferTools, ToolNames, ToolInput, ToolOutput } from "../server/index.js";
import { createTestServer } from "../test/utils.js";

const server = createTestServer();
type TestServer = typeof server;

test("InferTools extracts the tool registry type (widgets + registerTool)", () => {
  type Tools = InferTools<TestServer>;

  expectTypeOf<Tools>().toHaveProperty("search-voyage");
  expectTypeOf<Tools>().toHaveProperty("get-trip-details");
  expectTypeOf<Tools>().toHaveProperty("no-input-widget");
  expectTypeOf<Tools>().toHaveProperty("calculate-price");
});

test("ToolNames returns a union of tool name literals (widgets + registerTool)", () => {
  type Names = ToolNames<TestServer>;

  expectTypeOf<Names>().toEqualTypeOf<
    "search-voyage" | "get-trip-details" | "no-input-widget" | "calculate-price"
  >();
});

test("ToolInput extracts the correct input type from Zod schema", () => {
  type SearchInput = ToolInput<TestServer, "search-voyage">;

  expectTypeOf<SearchInput>().toEqualTypeOf<{
    destination: string;
    departureDate?: string | undefined;
    maxPrice?: number | undefined;
  }>();

  type DetailsInput = ToolInput<TestServer, "get-trip-details">;

  expectTypeOf<DetailsInput>().toEqualTypeOf<{
    tripId: string;
  }>();

  type CalculateInput = ToolInput<TestServer, "calculate-price">;

  expectTypeOf<CalculateInput>().toEqualTypeOf<{
    tripId: string;
    passengers: number;
  }>();
});

test("ToolOutput extracts the correct output type from Zod schema", () => {
  type SearchOutput = ToolOutput<TestServer, "search-voyage">;

  expectTypeOf<SearchOutput>().toEqualTypeOf<{
    results: Array<{
      id: string;
      name: string;
      price: number;
    }>;
    totalCount: number;
  }>();

  type DetailsOutput = ToolOutput<TestServer, "get-trip-details">;

  expectTypeOf<DetailsOutput>().toEqualTypeOf<{
    name: string;
    description: string;
    images: string[];
  }>();

  type CalculateOutput = ToolOutput<TestServer, "calculate-price">;

  expectTypeOf<CalculateOutput>().toEqualTypeOf<{
    totalPrice: number;
    currency: string;
  }>();
});

test("createTypedHooks provides autocomplete for tool names (widgets + registerTool)", () => {
  const { useCallTool } = createTypedHooks<TestServer>();

  useCallTool("search-voyage");
  useCallTool("get-trip-details");
  useCallTool("no-input-widget");
  useCallTool("calculate-price");

  // @ts-expect-error - "invalid-name" is not a valid tool name
  useCallTool("invalid-name");
});

test("useCallTool returns correctly typed callTool function", () => {
  const { useCallTool } = createTypedHooks<TestServer>();
  const { callTool } = useCallTool("search-voyage");

  callTool({ destination: "Spain" });
  callTool({ destination: "France", departureDate: "2024-06-01" });
  callTool({ destination: "Italy", maxPrice: 1000 });

  const { callTool: calculateTool } = useCallTool("calculate-price");
  calculateTool({ tripId: "123", passengers: 2 });
});

test("useCallTool returns correctly typed data", () => {
  const { useCallTool } = createTypedHooks<TestServer>();
  const { data } = useCallTool("search-voyage");

  if (data) {
    expectTypeOf(data.structuredContent).toExtend<{
      results: Array<{
        id: string;
        name: string;
        price: number;
      }>;
      totalCount: number;
    }>();

    expectTypeOf(data.structuredContent.results).toBeArray();
    expectTypeOf(data.structuredContent.totalCount).toBeNumber();
  }
});


test("tools with no outputSchema have empty object output type", () => {
  type NoInputOutput = ToolOutput<TestServer, "no-input-widget">;

  expectTypeOf<NoInputOutput>().toEqualTypeOf<{}>();
});

test("createTypedHooks provides autocomplete for tool names in useToolInfo (widgets + registerTool)", () => {
  const { useToolInfo } = createTypedHooks<TestServer>();

  useToolInfo<"search-voyage">();
  useToolInfo<"get-trip-details">();
  useToolInfo<"no-input-widget">();
  useToolInfo<"calculate-price">();

  // @ts-expect-error - "invalid-name" is not a valid tool name
  useToolInfo<"invalid-name">();
});

test("useToolInfo infers input types from ToolInput utility", () => {
  const { useToolInfo } = createTypedHooks<TestServer>();
  const toolInfo = useToolInfo<"search-voyage">();

  type ExpectedInput = ToolInput<TestServer, "search-voyage">;
  expectTypeOf(toolInfo.input).toExtend<ExpectedInput>();

  const detailsInfo = useToolInfo<"get-trip-details">();
  type ExpectedDetailsInput = ToolInput<TestServer, "get-trip-details">;
  expectTypeOf(detailsInfo.input).toExtend<ExpectedDetailsInput>();

  const calculateInfo = useToolInfo<"calculate-price">();
  type ExpectedCalculateInput = ToolInput<TestServer, "calculate-price">;
  expectTypeOf(calculateInfo.input).toExtend<ExpectedCalculateInput>();
});

test("useToolInfo infers output types from ToolOutput utility", () => {
  const { useToolInfo } = createTypedHooks<TestServer>();
  const toolInfo = useToolInfo<"search-voyage">();

  type ExpectedOutput = ToolOutput<TestServer, "search-voyage">;
  if (toolInfo.status === "success") {
    expectTypeOf(toolInfo.output).toExtend<ExpectedOutput>();
  }

  const detailsInfo = useToolInfo<"get-trip-details">();
  type ExpectedDetailsOutput = ToolOutput<TestServer, "get-trip-details">;
  if (detailsInfo.status === "success") {
    expectTypeOf(detailsInfo.output).toExtend<ExpectedDetailsOutput>();
  }

  const calculateInfo = useToolInfo<"calculate-price">();
  type ExpectedCalculateOutput = ToolOutput<TestServer, "calculate-price">;
  if (calculateInfo.status === "success") {
    expectTypeOf(calculateInfo.output).toExtend<ExpectedCalculateOutput>();
  }
});

