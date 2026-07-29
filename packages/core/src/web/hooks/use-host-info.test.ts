import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HostAdaptor } from "../bridges/adaptor.js";
import { McpAppBridge } from "../bridges/mcp-app/bridge.js";
import {
  getMcpAppHostPostMessageMock,
  MockResizeObserver,
} from "./test/utils.js";
import { type Host, useHostInfo } from "./use-host-info.js";

const stubHost = (hostInfo?: { name: string; version: string }) => {
  vi.stubGlobal("parent", {
    postMessage: getMcpAppHostPostMessageMock({}, { hostInfo }),
  });
};

describe("useHostInfo", () => {
  beforeEach(() => {
    HostAdaptor.resetInstance();
    McpAppBridge.resetInstance();
    vi.stubGlobal("openai", undefined);
    vi.stubGlobal("skybridge", { hostType: "mcp-app" });
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
    McpAppBridge.resetInstance();
    HostAdaptor.resetInstance();
  });

  it("is undefined before the handshake resolves, then populated after", async () => {
    stubHost({ name: "Claude", version: "1.2.3" });
    const { result } = renderHook(() => useHostInfo());

    expect(result.current.name).toBeUndefined();
    expect(result.current.version).toBeUndefined();

    await waitFor(() => {
      expect(result.current.name).toBe("claude");
      expect(result.current.version).toBe("1.2.3");
    });
  });

  it.each<[string, Host]>([
    ["chatgpt", "chatgpt"],
    ["Claude", "claude"],
    ["Cursor", "cursor"],
    ["MCP-UI Host", "goose"],
    ["Le Chat", "mistral-vibe"],
    ["alpic-playground", "alpic"],
  ])("normalizes reported name %j to slug %j", async (reported, slug) => {
    stubHost({ name: reported, version: "1.0.0" });
    const { result } = renderHook(() => useHostInfo());

    await waitFor(() => {
      expect(result.current.name).toBe(slug);
    });
  });

  it("preserves an unrecognized reported name as-is", async () => {
    stubHost({ name: "Some Future Host", version: "9.9.9" });
    const { result } = renderHook(() => useHostInfo());

    await waitFor(() => {
      expect(result.current.name).toBe("Some Future Host");
      expect(result.current.version).toBe("9.9.9");
    });
  });
});
