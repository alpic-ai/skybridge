import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HostAdaptor } from "../bridges/adaptor.js";
import { McpAppBridge } from "../bridges/mcp-app/index.js";
import {
  fireToolResultNotification,
  getMcpAppHostPostMessageMock,
  MockResizeObserver,
} from "./test/utils.js";
import { useDeepLink } from "./use-deep-link.js";
import { useModelContext } from "./use-model-context.js";
import { useViewState } from "./use-view-state.js";

async function notifyHostContext(params: Record<string, unknown>) {
  await act(async () => {
    window.dispatchEvent(
      new MessageEvent("message", {
        source: window.parent,
        data: {
          jsonrpc: "2.0",
          method: "ui/notifications/host-context-changed",
          params,
        },
      }),
    );
  });
}

const sentModelContext = (postMessage: ReturnType<typeof vi.fn>) =>
  postMessage.mock.calls.some(
    ([message]) => message.method === "ui/update-model-context",
  );

describe("OpenAI extensions in the view", () => {
  beforeEach(() => {
    vi.stubGlobal("openai", undefined);
    vi.stubGlobal("skybridge", {});
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
    localStorage.clear();
  });

  afterEach(() => {
    HostAdaptor.resetInstance();
    McpAppBridge.resetInstance();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("publishes model context and follows its removal by the user", async () => {
    const postMessage = getMcpAppHostPostMessageMock(
      {},
      { hostCapabilities: { experimental: { "openai/modelContext": {} } } },
    );
    vi.stubGlobal("parent", { postMessage });
    const { result } = renderHook(useModelContext);
    await waitFor(() => expect(result.current.supported).toBe(true));
    const content = [
      {
        type: "text" as const,
        text: "Selected ski",
        _meta: { "openai/title": "Ski" },
      },
    ];

    await act(async () => result.current.update({ content }));
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "ui/update-model-context",
        params: { content },
      }),
      "*",
    );

    await notifyHostContext({
      "openai/modelContext": { updateId: "one", content },
    });
    expect(result.current.context).toEqual({ updateId: "one", content });
    await notifyHostContext({ "openai/modelContext": null });
    expect(result.current.context).toBeNull();
  });

  it("rejects model context updates on hosts without the extension", async () => {
    const postMessage = getMcpAppHostPostMessageMock();
    vi.stubGlobal("parent", { postMessage });
    const { result } = renderHook(useModelContext);

    await expect(result.current.update({ content: [] })).rejects.toThrow(
      "openai/modelContext",
    );
    expect(result.current.supported).toBe(false);
    expect(sentModelContext(postMessage)).toBe(false);
  });

  it("keeps private view state out of the model context and apart from shared state", async () => {
    const postMessage = getMcpAppHostPostMessageMock();
    vi.stubGlobal("parent", { postMessage });
    const { result } = renderHook(() => ({
      local: useViewState({ page: 1 }, { modelContext: false }),
      shared: useViewState({ tab: "a" }),
    }));
    await act(async () => {
      fireToolResultNotification({
        content: [],
        structuredContent: {},
        _meta: { viewUUID: "view-1" },
      });
    });

    act(() => result.current.local[1]({ page: 2 }));

    expect(result.current.local[0]).toEqual({ page: 2 });
    expect(result.current.shared[0]).toEqual({ tab: "a" });
    const keys = Array.from(
      { length: localStorage.length },
      (_, index) => localStorage.key(index) ?? "",
    );
    expect(keys.filter((key) => key.startsWith("sb:"))).toEqual([]);
    expect(keys.filter((key) => key.startsWith("sbp:"))).toHaveLength(1);
    expect(sentModelContext(postMessage)).toBe(false);
  });

  it("reads split legacy deep links and ignores malformed ones", async () => {
    vi.stubGlobal("parent", {
      postMessage: getMcpAppHostPostMessageMock({
        "openai/deepLink": { url: "/parts?tag=bolt" },
      }),
    });
    const { result } = renderHook(useDeepLink);
    await waitFor(() => expect(result.current).toBe("/parts?tag=bolt"));

    await notifyHostContext({
      "openai/deepLink": {
        path: ["parts", "a/b"],
        query: [["tag", "hex bolt"]],
      },
    });
    expect(result.current).toBe("/parts/a%2Fb?tag=hex+bolt");

    await notifyHostContext({ "openai/deepLink": { url: "//evil.test" } });
    expect(result.current).toBeUndefined();
  });
});
