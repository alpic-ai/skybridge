import type { CallToolResponse } from "skybridge/web";
import { describe, expect, it, vi } from "vitest";
import {
  estimateContextTokens,
  getToolOutputTokenCount,
  getViewStateTokenCount,
  TOOL_OUTPUT_WARNING_TOKENS,
  warnOnLargeToolOutput,
} from "./context-warnings.js";

const response = (
  structuredContent: Record<string, unknown>,
  meta?: Record<string, unknown>,
): CallToolResponse => ({
  content: [],
  structuredContent,
  isError: false,
  meta,
});

describe("context warnings", () => {
  it("estimates one token per four UTF-8 bytes and returns zero for no content", () => {
    expect(estimateContextTokens("é")).toBe(1);
    expect(estimateContextTokens(undefined)).toBe(0);
  });

  it("excludes tool response metadata from the estimate", () => {
    expect(
      getToolOutputTokenCount(response({}, { private: "x".repeat(100_000) })),
    ).toBe(getToolOutputTokenCount(response({})));
  });

  it("only measures model-visible view state", () => {
    expect(
      getViewStateTokenCount({
        modelContent: {},
        privateContent: { private: "x".repeat(100_000) },
      }),
    ).toBe(estimateContextTokens({}));
  });

  it("warns when model-visible tool output reaches the threshold", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const largeResponse = response({
      content: "x".repeat(TOOL_OUTPUT_WARNING_TOKENS * 4),
    });

    warnOnLargeToolOutput(largeResponse, "large-output");

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Tool "large-output" returned'),
    );
    warnSpy.mockRestore();
  });

  it("does not warn for large metadata", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    warnOnLargeToolOutput(
      response({}, { private: "x".repeat(100_000) }),
      "large-meta",
    );

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
