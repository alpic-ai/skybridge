import { expectTypeOf, test } from "vitest";
import { createTypedHooks } from "./typed-hooks.js";
import type {
  McpServer,
  InferWidgets,
  WidgetNames,
  WidgetInput,
  WidgetOutput,
  WidgetDef,
} from "../server/index.js";

type TestWidgetRegistry = {
  "search-voyage": WidgetDef<
    {
      destination: string;
      departureDate?: string | undefined;
      maxPrice?: number | undefined;
    },
    {
      results: Array<{
        id: string;
        name: string;
        price: number;
      }>;
      totalCount: number;
    }
  >;
  "get-trip-details": WidgetDef<
    { tripId: string },
    {
      name: string;
      description: string;
      images: string[];
    }
  >;
  "no-input-widget": WidgetDef<{}, {}>;
};

type TestServer = McpServer<TestWidgetRegistry>;

test("InferWidgets extracts the widget registry type", () => {
  type Widgets = InferWidgets<TestServer>;

  expectTypeOf<Widgets>().toHaveProperty("search-voyage");
  expectTypeOf<Widgets>().toHaveProperty("get-trip-details");
  expectTypeOf<Widgets>().toHaveProperty("no-input-widget");
});

test("WidgetNames returns a union of widget name literals", () => {
  type Names = WidgetNames<TestServer>;

  expectTypeOf<Names>().toEqualTypeOf<
    "search-voyage" | "get-trip-details" | "no-input-widget"
  >();
});

test("WidgetInput extracts the correct input type from Zod schema", () => {
  type SearchInput = WidgetInput<TestServer, "search-voyage">;

  expectTypeOf<SearchInput>().toEqualTypeOf<{
    destination: string;
    departureDate?: string | undefined;
    maxPrice?: number | undefined;
  }>();

  type DetailsInput = WidgetInput<TestServer, "get-trip-details">;

  expectTypeOf<DetailsInput>().toEqualTypeOf<{
    tripId: string;
  }>();
});

test("WidgetOutput extracts the correct output type from Zod schema", () => {
  type SearchOutput = WidgetOutput<TestServer, "search-voyage">;

  expectTypeOf<SearchOutput>().toEqualTypeOf<{
    results: Array<{
      id: string;
      name: string;
      price: number;
    }>;
    totalCount: number;
  }>();

  type DetailsOutput = WidgetOutput<TestServer, "get-trip-details">;

  expectTypeOf<DetailsOutput>().toEqualTypeOf<{
    name: string;
    description: string;
    images: string[];
  }>();
});

test("createTypedHooks provides autocomplete for widget names", () => {
  const { useCallTool } = createTypedHooks<TestServer>();

  useCallTool("search-voyage");
  useCallTool("get-trip-details");
  useCallTool("no-input-widget");

  // @ts-expect-error - "invalid-name" is not a valid widget name
  useCallTool("invalid-name");
});

test("useCallTool returns correctly typed callTool function", () => {
  const { useCallTool } = createTypedHooks<TestServer>();
  const { callTool } = useCallTool("search-voyage");

  callTool({ destination: "Spain" });
  callTool({ destination: "France", departureDate: "2024-06-01" });
  callTool({ destination: "Italy", maxPrice: 1000 });
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


test("widgets with no outputSchema have empty object output type", () => {
  type NoInputOutput = WidgetOutput<TestServer, "no-input-widget">;

  expectTypeOf<NoInputOutput>().toEqualTypeOf<{}>();
});



