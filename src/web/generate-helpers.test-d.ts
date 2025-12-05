import { expectTypeOf, test } from "vitest";
import { generateHelpers } from "./generate-helpers.js";
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
  expectTypeOf<Tools>().toHaveProperty("inferred-output-widget");
  expectTypeOf<Tools>().toHaveProperty("inferred-tool");
});

test("ToolNames returns a union of tool name literals (widgets + registerTool)", () => {
  type Names = ToolNames<TestServer>;

  expectTypeOf<Names>().toEqualTypeOf<
    | "search-voyage"
    | "get-trip-details"
    | "no-input-widget"
    | "calculate-price"
    | "inferred-output-widget"
    | "inferred-tool"
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

test("ToolOutput extracts the correct output type from callback's structuredContent", () => {
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

  // Note: outputSchema has totalPrice: z.string(), but callback returns number
  // Type is inferred from callback, so totalPrice is number
  type CalculateOutput = ToolOutput<TestServer, "calculate-price">;

  expectTypeOf<CalculateOutput>().toEqualTypeOf<{
    totalPrice: number;
    currency: string;
  }>();

  type NoInputOutput = ToolOutput<TestServer, "no-input-widget">;
  expectTypeOf<NoInputOutput>().toEqualTypeOf<{}>();
});

test("ToolOutput extracts the correct output type from callback (inferred)", () => {
  type InferredWidgetOutput = ToolOutput<TestServer, "inferred-output-widget">;

  expectTypeOf<InferredWidgetOutput>().toEqualTypeOf<{
    inferredResults: { id: string; score: number }[];
    inferredCount: number;
  }>();

  type InferredToolOutput = ToolOutput<TestServer, "inferred-tool">;

  expectTypeOf<InferredToolOutput>().toEqualTypeOf<{
    itemDetails: { name: string; available: boolean };
    fetchedAt: string;
  }>();
});

test("generateHelpers provides autocomplete for tool names (widgets + registerTool)", () => {
  const { useCallTool } = generateHelpers<TestServer>();

  useCallTool("search-voyage");
  useCallTool("get-trip-details");
  useCallTool("no-input-widget");
  useCallTool("calculate-price");
  useCallTool("inferred-output-widget");
  useCallTool("inferred-tool");

  // @ts-expect-error - "invalid-name" is not a valid tool name
  useCallTool("invalid-name");
});

test("useCallTool returns correctly typed callTool function", () => {
  const { useCallTool } = generateHelpers<TestServer>();
  const { callTool } = useCallTool("search-voyage");

  callTool({ destination: "Spain" });
  callTool({ destination: "France", departureDate: "2024-06-01" });
  callTool({ destination: "Italy", maxPrice: 1000 });

  const { callTool: calculateTool } = useCallTool("calculate-price");
  calculateTool({ tripId: "123", passengers: 2 });
});

test("callTool can be called without args for tools with no required inputs", () => {
  const { useCallTool } = generateHelpers<TestServer>();
  const { callTool, callToolAsync } = useCallTool("no-input-widget");

  callTool();

  callTool({});

  callToolAsync();
  callToolAsync({});
});

test("callTool requires args for tools with required inputs", () => {
  const { useCallTool } = generateHelpers<TestServer>();
  const { callTool } = useCallTool("search-voyage");

  // @ts-expect-error - "destination" is required
  callTool();

  // @ts-expect-error - "destination" is required
  callTool({});

  // This should work
  callTool({ destination: "Spain" });
});

test("callTool supports sideEffects for tools with required inputs", () => {
  const { useCallTool } = generateHelpers<TestServer>();
  const { callTool, data } = useCallTool("search-voyage");

  callTool({ destination: "Spain" }, {
    onSuccess: (response, args) => {
      expectTypeOf(response.structuredContent.results).toBeArray();
      expectTypeOf(args.destination).toBeString();
    },
    onError: (error, args) => {
      expectTypeOf(error).toBeUnknown();
      expectTypeOf(args.destination).toBeString();
    },
    onSettled: (response, error, args) => {
      if (response) {
        expectTypeOf(response.structuredContent.totalCount).toBeNumber();
      }
      expectTypeOf(args.destination).toBeString();
    },
  });
});

test("callTool supports sideEffects for tools with no required inputs", () => {
  const { useCallTool } = generateHelpers<TestServer>();
  const { callTool } = useCallTool("no-input-widget");

  callTool({
    onSuccess: (response) => {
      expectTypeOf(response).toHaveProperty("structuredContent");
    },
  });

  callTool({}, {
    onSuccess: (response) => {
      expectTypeOf(response).toHaveProperty("structuredContent");
    },
  });
});

test("callToolAsync returns correctly typed promise", () => {
  const { useCallTool } = generateHelpers<TestServer>();

  const { callToolAsync: searchAsync } = useCallTool("search-voyage");
  const searchPromise = searchAsync({ destination: "Spain" });
  expectTypeOf(searchPromise).resolves.toHaveProperty("structuredContent");

  const { callToolAsync: noInputAsync } = useCallTool("no-input-widget");
  const noInputPromise = noInputAsync();
  expectTypeOf(noInputPromise).resolves.toHaveProperty("structuredContent");
});

test("useCallTool returns correctly typed data", () => {
  const { useCallTool } = generateHelpers<TestServer>();
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

test("useCallTool returns correctly typed data for callback-inferred outputs", () => {
  const { useCallTool } = generateHelpers<TestServer>();

  const { data: widgetData } = useCallTool("inferred-output-widget");
  if (widgetData) {
    expectTypeOf(widgetData.structuredContent).toExtend<{
      inferredResults: { id: string; score: number }[];
      inferredCount: number;
    }>();
  }

  const { data: toolData } = useCallTool("inferred-tool");
  if (toolData) {
    expectTypeOf(toolData.structuredContent).toExtend<{
      itemDetails: { name: string; available: boolean };
      fetchedAt: string;
    }>();
  }
});

test("generateHelpers provides autocomplete for tool names in useToolInfo (widgets + registerTool)", () => {
  const { useToolInfo } = generateHelpers<TestServer>();

  useToolInfo<"search-voyage">();
  useToolInfo<"get-trip-details">();
  useToolInfo<"no-input-widget">();
  useToolInfo<"calculate-price">();
  useToolInfo<"inferred-output-widget">();
  useToolInfo<"inferred-tool">();

  // @ts-expect-error - "invalid-name" is not a valid tool name
  useToolInfo<"invalid-name">();
});

test("useToolInfo infers input and output types", () => {
  const { useToolInfo } = generateHelpers<TestServer>();
  const toolInfo = useToolInfo<"search-voyage">();

  expectTypeOf(toolInfo.input).toExtend<ToolInput<TestServer, "search-voyage">>();

  if (toolInfo.status === "success") {
    expectTypeOf(toolInfo.output).toExtend<ToolOutput<TestServer, "search-voyage">>();
    expectTypeOf(toolInfo.output.results).toBeArray();
    expectTypeOf(toolInfo.output.totalCount).toBeNumber();
  }
});

