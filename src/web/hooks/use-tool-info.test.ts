import { fireEvent, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useToolInfo } from "./use-tool-info.js";
import {
  SET_GLOBALS_EVENT_TYPE,
  SetGlobalsEvent,
  type OpenAiGlobals,
} from "../types.js";

describe("useToolInfo", () => {
  let OpenaiMock: Pick<
    OpenAiGlobals,
    "toolInput" | "toolOutput" | "toolResponseMetadata"
  >;

  beforeEach(() => {
    OpenaiMock = {
      toolInput: { name: "pokemon", args: { name: "pikachu" } },
      toolOutput: null,
      toolResponseMetadata: null,
    };
    vi.stubGlobal("openai", OpenaiMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it("should return toolInput on initial mount window.openai", () => {
    const { result } = renderHook(() => useToolInfo());

    expect(result.current.input).toEqual({
      name: "pokemon",
      args: { name: "pikachu" },
    });
    expect(result.current.status).toEqual("pending");
    expect(result.current.isPending).toEqual(true);
    expect(result.current.isSuccess).toEqual(false);
    expect(result.current.output).toEqual(undefined);
    expect(result.current.responseMetadata).toEqual(undefined);
  });

  it("should eventually return tool output and response metadata once tool call completes", () => {
    const { result } = renderHook(() => useToolInfo());

    fireEvent(
      window,
      new SetGlobalsEvent(SET_GLOBALS_EVENT_TYPE, {
        detail: {
          globals: {
            toolOutput: {
              name: "pikachu",
              color: "yellow",
              description:
                "When several of these POKéMON gather, their\felectricity could build and cause lightning storms.",
            },
            toolResponseMetadata: { id: 12 },
          },
        },
      })
    );

    waitFor(() => {
      expect(result.current.status).toEqual("success");
      expect(result.current.isPending).toEqual(false);
      expect(result.current.isSuccess).toEqual(true);
      expect(result.current.output).toEqual({
        name: "pikachu",
        color: "yellow",
        description:
          "When several of these POKéMON gather, their\felectricity could build and cause lightning storms.",
      });
      expect(result.current.responseMetadata).toEqual({ id: 12 });
    });
  });
});
