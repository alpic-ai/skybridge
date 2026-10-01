import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HostAdaptor } from "../bridges/adaptor.js";
import { McpAppBridge } from "../bridges/mcp-app/index.js";
import {
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

describe("model context and deep links in the view", () => {
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

  it("merges model context with view state and drops it once the user removes it", async () => {
    const postMessage = getMcpAppHostPostMessageMock(
      {},
      { hostCapabilities: { updateModelContext: {} } },
    );
    vi.stubGlobal("parent", { postMessage });
    const { result } = renderHook(() => ({
      model: useModelContext(),
      view: useViewState({ tab: "a" }),
    }));
    await waitFor(() => expect(result.current.model.supported).toBe(true));
    const content = [
      {
        type: "text" as const,
        text: "Selected ski",
        _meta: { "openai/title": "Ski" },
      },
    ];
    const lastModelContext = () =>
      postMessage.mock.calls
        .map(([message]) => message as { method: string; params?: unknown })
        .filter((message) => message.method === "ui/update-model-context")
        .at(-1)?.params;

    await act(async () =>
      result.current.model.update({
        content,
        structuredContent: { ski: 1, tab: "x" },
      }),
    );
    await act(async () => result.current.view[1]({ tab: "b" }));
    expect(lastModelContext()).toEqual({
      structuredContent: { ski: 1, tab: "b" },
      content: [
        {
          type: "text",
          text: JSON.stringify({ tab: "b" }),
          annotations: { audience: ["assistant"] },
        },
        ...content,
      ],
    });

    await notifyHostContext({
      "openai/modelContext": { updateId: "one", content },
    });
    expect(result.current.model.context).toEqual({ updateId: "one", content });
    await notifyHostContext({ "openai/modelContext": null });
    expect(result.current.model.context).toBeNull();

    await act(async () => result.current.view[1]({ tab: "c" }));
    expect(lastModelContext()).toEqual({
      structuredContent: { tab: "c" },
      content: [
        {
          type: "text",
          text: JSON.stringify({ tab: "c" }),
          annotations: { audience: ["assistant"] },
        },
      ],
    });
  });

  it("rejects model context updates on hosts without the capability", async () => {
    const postMessage = getMcpAppHostPostMessageMock();
    vi.stubGlobal("parent", { postMessage });
    const { result } = renderHook(useModelContext);

    await expect(result.current.update({ content: [] })).rejects.toThrow(
      "updateModelContext",
    );
    expect(result.current.supported).toBe(false);
    expect(
      postMessage.mock.calls.some(
        ([message]) => message.method === "ui/update-model-context",
      ),
    ).toBe(false);
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
