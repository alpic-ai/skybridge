import { describe, expect, it } from "vitest";
import { generateHelpers } from "./generate-helpers.js";
import { createMinimalTestServer } from "../test/utils.js";

const server = createMinimalTestServer();
type TestServer = typeof server;

describe("generateHelpers", () => {
  it("should return an object with useCallTool hook", () => {
    const hooks = generateHelpers<TestServer>();
    expect(hooks).toHaveProperty("useCallTool");
    expect(typeof hooks.useCallTool).toBe("function");
  });

  it("should return an object with useToolInfo hook", () => {
    const hooks = generateHelpers<TestServer>();
    expect(hooks).toHaveProperty("useToolInfo");
    expect(typeof hooks.useToolInfo).toBe("function");
  });
});

