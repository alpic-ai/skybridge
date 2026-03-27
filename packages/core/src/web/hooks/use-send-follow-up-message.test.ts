import { renderHook } from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from "vitest";
import { useSendFollowUpMessage } from "./use-send-follow-up-message.js";

describe("useSendFollowUpMessage", () => {
  let OpenaiMock: { sendFollowUpMessage: Mock };

  beforeEach(() => {
    OpenaiMock = {
      sendFollowUpMessage: vi.fn().mockResolvedValue(undefined),
    };
    vi.stubGlobal("openai", OpenaiMock);
    vi.stubGlobal("skybridge", { hostType: "apps-sdk" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it("should call window.openai.sendFollowUpMessage with the prompt", () => {
    const { result } = renderHook(() => useSendFollowUpMessage());

    result.current("Tell me more");

    expect(OpenaiMock.sendFollowUpMessage).toHaveBeenCalledWith({
      prompt: "Tell me more",
    });
  });

  it("should forward scrollToBottom when provided", () => {
    const { result } = renderHook(() => useSendFollowUpMessage());

    result.current("Tell me more", { scrollToBottom: false });

    expect(OpenaiMock.sendFollowUpMessage).toHaveBeenCalledWith({
      prompt: "Tell me more",
      scrollToBottom: false,
    });
  });
});
