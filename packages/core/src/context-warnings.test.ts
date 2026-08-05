import { describe, expect, it, vi } from "vitest";
import {
  estimateContextTokens,
  TOOL_OUTPUT_WARNING_TOKENS,
  warnOnLargeToolOutput,
} from "./context-warnings.js";

describe("context warnings", () => {
  it("estimates UTF-8 bytes and returns zero for no content", () => {
    expect(estimateContextTokens("é")).toBe(1);
    expect(estimateContextTokens(undefined)).toBe(0);
  });

  it("warns when model-visible tool output reaches the threshold", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    warnOnLargeToolOutput(
      {
        content: [
          {
            type: "text",
            text: "x".repeat(TOOL_OUTPUT_WARNING_TOKENS * 4),
          },
        ],
      },
      "large-output",
    );

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Tool "large-output" returned'),
    );
    warnSpy.mockRestore();
  });

  it("does not warn for large metadata", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    warnOnLargeToolOutput(
      { content: [], _meta: { private: "x".repeat(100_000) } },
      "large-meta",
    );

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
