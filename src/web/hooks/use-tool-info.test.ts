import { fireEvent, renderHook, waitFor, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useToolInfo } from "./use-tool-info.js";
import {
  SET_GLOBALS_EVENT_TYPE,
  SetGlobalsEvent,
  type OpenAiProperties,
} from "../types.js";

describe("useToolInfo", () => {
  let OpenaiMock: Pick<
    OpenAiProperties,
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
    
    expect(result.current).toMatchObject({
      input: { name: "pokemon", args: { name: "pikachu" } },
      status: "pending",
      isPending: true,
      isSuccess: false,
    });
  });

  it("should eventually return tool output and response metadata once tool call completes", async () => {
    const toolOutput = {
      name: "pikachu",
      color: "yellow",
      description:
        "When several of these POKéMON gather, their\felectricity could build and cause lightning storms.",
    };
    const toolResponseMetadata = { id: 12 };
    const { result } = renderHook(() => useToolInfo());

    act(() => {
      OpenaiMock.toolOutput = toolOutput;
      OpenaiMock.toolResponseMetadata = toolResponseMetadata;
      fireEvent(
        window,
        new SetGlobalsEvent(SET_GLOBALS_EVENT_TYPE, {
          detail: {
            globals: {
              toolOutput,
              toolResponseMetadata,
            },
          },
        })
      );
    });

    await waitFor(() => {
      expect(result.current).toMatchObject({
        status: "success",
        isPending: false,
        isSuccess: true,
        output: toolOutput,
        responseMetadata: toolResponseMetadata,
      });
    });
  });
});
