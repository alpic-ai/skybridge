import { describe, expect, it } from "vitest";
import { hostFromUserAgent } from "./host.js";

describe("hostFromUserAgent", () => {
  it("classifies known hosts case-insensitively and defaults to unknown", () => {
    expect(hostFromUserAgent("openai-mcp/1.0")).toBe("openai");
    expect(hostFromUserAgent("ChatGPT")).toBe("openai");
    expect(hostFromUserAgent("claude-user")).toBe("claude");
    expect(hostFromUserAgent("Claude-User/1.0")).toBe("unknown");
    expect(hostFromUserAgent("Mozilla/5.0")).toBe("unknown");
    expect(hostFromUserAgent(undefined)).toBe("unknown");
  });
});
