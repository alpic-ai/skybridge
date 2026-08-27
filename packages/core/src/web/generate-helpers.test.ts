import { describe, expect, it } from "vitest";
import { createMinimalTestApp } from "../test/utils.js";
import { generateHelpers } from "./generate-helpers.js";

const app = createMinimalTestApp();
type TestApp = typeof app;

describe("generateHelpers", () => {
  it("should return an object with useCallTool hook", () => {
    const hooks = generateHelpers<TestApp>();
    expect(hooks).toHaveProperty("useCallTool");
    expect(typeof hooks.useCallTool).toBe("function");
  });

  it("should return an object with useToolInfo hook", () => {
    const hooks = generateHelpers<TestApp>();
    expect(hooks).toHaveProperty("useToolInfo");
    expect(typeof hooks.useToolInfo).toBe("function");
  });
});
