import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { McpAppBridge } from "../bridges/mcp-app/bridge.js";
import { useSendFollowUpMessage } from "./use-send-follow-up-message.js";

describe("useSendFollowUpMessage", () => {
  describe("apps-sdk host", () => {
    let sendFollowUpMessageMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      sendFollowUpMessageMock = vi.fn();
      vi.stubGlobal("openai", {
        sendFollowUpMessage: sendFollowUpMessageMock,
      });
      vi.stubGlobal("skybridge", { hostType: "apps-sdk" });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.resetAllMocks();
    });

    it("should return a function that calls window.openai.sendFollowUpMessage with the prompt", () => {
      const { result } = renderHook(() => useSendFollowUpMessage());

      const prompt = "Test message";
      result.current(prompt);

      expect(sendFollowUpMessageMock).toHaveBeenCalledTimes(1);
      expect(sendFollowUpMessageMock).toHaveBeenCalledWith({ prompt });
    });

    it("should forward scrollToBottom option to window.openai.sendFollowUpMessage", () => {
      const { result } = renderHook(() => useSendFollowUpMessage());

      const prompt = "Test message";
      result.current(prompt, { scrollToBottom: false });

      expect(sendFollowUpMessageMock).toHaveBeenCalledTimes(1);
      expect(sendFollowUpMessageMock).toHaveBeenCalledWith({
        prompt,
        scrollToBottom: false,
      });
    });

    it("should send follow-up message with scrollToBottom set to true", () => {
      const { result } = renderHook(() => useSendFollowUpMessage());

      const prompt = "Test message with scroll";
      result.current(prompt, { scrollToBottom: true });

      expect(sendFollowUpMessageMock).toHaveBeenCalledTimes(1);
      expect(sendFollowUpMessageMock).toHaveBeenCalledWith({
        prompt,
        scrollToBottom: true,
      });
    });
  });

  describe("mcp-app host", () => {
    const mockPostMessage = vi.fn();

    beforeEach(() => {
      vi.stubGlobal("parent", { postMessage: mockPostMessage });
      vi.stubGlobal("skybridge", { hostType: "mcp-app" });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.resetAllMocks();
      McpAppBridge.resetInstance();
    });

    it("should return a function that sends ui/message request to the MCP host", () => {
      const { result } = renderHook(() => useSendFollowUpMessage());

      const prompt = "Test message";
      result.current(prompt);

      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          jsonrpc: "2.0",
          method: "ui/message",
          params: expect.objectContaining({
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
            ],
          }),
        }),
        "*",
      );
    });
  });
});
