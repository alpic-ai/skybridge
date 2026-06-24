import { describe, expect, it } from "vitest";
import { NotSupportedError } from "./types.js";

describe("NotSupportedError", () => {
  it("includes method name in message", () => {
    const err = new NotSupportedError("uploadFile");
    expect(err.message).toBe("uploadFile is not supported in this runtime");
    expect(err.name).toBe("NotSupportedError");
    expect(err.method).toBe("uploadFile");
  });

  it("includes reason when provided", () => {
    const err = new NotSupportedError("callTool", "MCP transport unavailable");
    expect(err.message).toBe(
      "callTool is not supported in this runtime: MCP transport unavailable",
    );
    expect(err.reason).toBe("MCP transport unavailable");
  });

  it("is an instance of Error", () => {
    expect(new NotSupportedError("x")).toBeInstanceOf(Error);
  });
});
