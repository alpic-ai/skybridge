import { describe, expect, it } from "vitest";
import { createTypedHooks } from "./typed-hooks.js";
import { createMinimalTestServer } from "../test/utils.js";

const server = createMinimalTestServer();
type TestServer = typeof server;

describe("createTypedHooks", () => {
  it("should return an object with useCallTool hook", () => {
    const hooks = createTypedHooks<TestServer>();
    expect(hooks).toHaveProperty("useCallTool");
    expect(typeof hooks.useCallTool).toBe("function");
  });

  it("should return an object with useToolInfo hook", () => {
    const hooks = createTypedHooks<TestServer>();
    expect(hooks).toHaveProperty("useToolInfo");
    expect(typeof hooks.useToolInfo).toBe("function");
  });
});

