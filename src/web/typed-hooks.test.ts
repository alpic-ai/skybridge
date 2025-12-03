import { describe, expect, it } from "vitest";
import { createTypedHooks } from "./typed-hooks.js";
import type { McpServer, WidgetDef } from "../server/index.js";

type MockWidgetRegistry = {
  "search-voyage": WidgetDef<
    { destination: string },
    { results: Array<{ id: string }> }
  >;
};

type MockServer = McpServer<MockWidgetRegistry>;

describe("createTypedHooks", () => {
  it("should return an object with useCallTool hook", () => {
    const hooks = createTypedHooks<MockServer>();
    expect(hooks).toHaveProperty("useCallTool");
    expect(typeof hooks.useCallTool).toBe("function");
  });
});

