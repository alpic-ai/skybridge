import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useToolInfo } from "./use-tool-info.js";

describe("useToolInfo", () => {
  let OpenaiMock: {
    toolInput: Record<string, unknown>;
    toolOutput: Record<string, unknown> | null;
    toolResponseMetadata: Record<string, unknown> | null;
  };

  beforeEach(() => {
    OpenaiMock = {
      toolInput: { name: "pikachu", args: { param: "value" } },
      toolOutput: {
        name: "pikachu",
        color: "yellow",
        description:
          "When several of these POKéMON gather, their\felectricity could build and cause lightning storms.",
      },
      toolResponseMetadata: { id: 12 },
    };
    vi.stubGlobal("openai", OpenaiMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it("should return toolInput, toolOutput, and toolResponseMetadata from window.openai", () => {
    const { result } = renderHook(() => useToolInfo());

    expect(result.current.input).toEqual({
      name: "pikachu",
      args: { param: "value" },
    });
    expect(result.current.output).toEqual({
      name: "pikachu",
      color: "yellow",
      description:
        "When several of these POKéMON gather, their\felectricity could build and cause lightning storms.",
    });
    expect(result.current.responseMetadata).toEqual({
      id: 12,
    });
  });
});
