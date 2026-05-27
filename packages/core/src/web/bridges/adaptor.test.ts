import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HostAdaptor } from "./adaptor.js";
import { AppsSdkBridge } from "./apps-sdk/bridge.js";
import { McpAppBridge } from "./mcp-app/bridge.js";

describe("HostAdaptor constructor", () => {
  beforeEach(() => {
    McpAppBridge.resetInstance();
    AppsSdkBridge.resetInstance();
    vi.stubGlobal("skybridge", { hostType: "mcp-app" });
    vi.stubGlobal("parent", { postMessage: vi.fn() });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    McpAppBridge.resetInstance();
    AppsSdkBridge.resetInstance();
  });

  it("instantiates without window.openai (oai is null)", () => {
    vi.stubGlobal("openai", undefined);
    const adaptor = new HostAdaptor();
    expect(adaptor.hasAppsSdkOverlay()).toBe(false);
  });

  it("captures window.openai when present (oai is set)", () => {
    vi.stubGlobal("openai", { widgetState: null });
    const adaptor = new HostAdaptor();
    expect(adaptor.hasAppsSdkOverlay()).toBe(true);
  });
});

describe("HostAdaptor MCP-routed methods", () => {
  beforeEach(() => {
    McpAppBridge.resetInstance();
    AppsSdkBridge.resetInstance();
    vi.stubGlobal("skybridge", { hostType: "mcp-app" });
    vi.stubGlobal("parent", { postMessage: vi.fn() });
    vi.stubGlobal("openai", undefined);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    McpAppBridge.resetInstance();
    AppsSdkBridge.resetInstance();
  });

  it("callTool delegates to mcp.callServerTool", async () => {
    const adaptor = new HostAdaptor();
    const fakeApp = {
      callServerTool: vi.fn().mockResolvedValue({
        content: [],
        structuredContent: { ok: true },
        isError: false,
        _meta: { x: 1 },
      }),
    };
    // biome-ignore lint/suspicious/noExplicitAny: test seam
    (adaptor as any).mcp.getApp = vi.fn().mockResolvedValue(fakeApp);

    const result = await adaptor.callTool("greet", { name: "alice" });
    expect(fakeApp.callServerTool).toHaveBeenCalledWith({
      name: "greet",
      arguments: { name: "alice" },
    });
    expect(result.structuredContent).toEqual({ ok: true });
    expect(result.meta).toEqual({ x: 1 });
  });

  it("requestDisplayMode delegates to mcp.requestDisplayMode", async () => {
    const adaptor = new HostAdaptor();
    const fakeApp = {
      requestDisplayMode: vi.fn().mockResolvedValue({ mode: "fullscreen" }),
    };
    // biome-ignore lint/suspicious/noExplicitAny: test seam
    (adaptor as any).mcp.getApp = vi.fn().mockResolvedValue(fakeApp);
    const r = await adaptor.requestDisplayMode("fullscreen");
    expect(r.mode).toBe("fullscreen");
    expect(fakeApp.requestDisplayMode).toHaveBeenCalledWith({
      mode: "fullscreen",
    });
  });

  it("requestClose delegates to mcp.requestTeardown", async () => {
    const adaptor = new HostAdaptor();
    const fakeApp = { requestTeardown: vi.fn().mockResolvedValue(undefined) };
    // biome-ignore lint/suspicious/noExplicitAny: test seam
    (adaptor as any).mcp.getApp = vi.fn().mockResolvedValue(fakeApp);
    await adaptor.requestClose();
    expect(fakeApp.requestTeardown).toHaveBeenCalled();
  });

  it("requestSize delegates to mcp.sendSizeChanged", async () => {
    const adaptor = new HostAdaptor();
    const fakeApp = { sendSizeChanged: vi.fn().mockResolvedValue(undefined) };
    // biome-ignore lint/suspicious/noExplicitAny: test seam
    (adaptor as any).mcp.getApp = vi.fn().mockResolvedValue(fakeApp);
    await adaptor.requestSize({ width: 100, height: 200 });
    expect(fakeApp.sendSizeChanged).toHaveBeenCalledWith({
      width: 100,
      height: 200,
    });
  });

  it("download returns isError when host lacks downloadFile capability", async () => {
    const adaptor = new HostAdaptor();
    const fakeApp = {
      getHostCapabilities: () => ({}),
      downloadFile: vi.fn(),
    };
    // biome-ignore lint/suspicious/noExplicitAny: test seam
    (adaptor as any).mcp.getApp = vi.fn().mockResolvedValue(fakeApp);
    const r = await adaptor.download({ contents: [] });
    expect(r.isError).toBe(true);
    expect(fakeApp.downloadFile).not.toHaveBeenCalled();
  });
});

describe("HostAdaptor conditional routing", () => {
  beforeEach(() => {
    McpAppBridge.resetInstance();
    AppsSdkBridge.resetInstance();
    vi.stubGlobal("skybridge", { hostType: "apps-sdk" });
    vi.stubGlobal("parent", { postMessage: vi.fn() });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    McpAppBridge.resetInstance();
    AppsSdkBridge.resetInstance();
  });

  it("sendFollowUpMessage uses oai when scrollToBottom set", async () => {
    const sendFollowUpMessage = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("openai", { sendFollowUpMessage });
    const adaptor = new HostAdaptor();
    await adaptor.sendFollowUpMessage("hi", { scrollToBottom: false });
    expect(sendFollowUpMessage).toHaveBeenCalledWith({
      prompt: "hi",
      scrollToBottom: false,
    });
  });

  it("sendFollowUpMessage uses mcp when no options", async () => {
    vi.stubGlobal("openai", undefined);
    const adaptor = new HostAdaptor();
    const fakeApp = { sendMessage: vi.fn().mockResolvedValue(undefined) };
    // biome-ignore lint/suspicious/noExplicitAny: test seam
    (adaptor as any).mcp.getApp = vi.fn().mockResolvedValue(fakeApp);
    await adaptor.sendFollowUpMessage("hi");
    expect(fakeApp.sendMessage).toHaveBeenCalledWith({
      role: "user",
      content: [{ type: "text", text: "hi" }],
    });
  });

  it("openExternal uses oai when redirectUrl: false", async () => {
    const openExternal = vi.fn();
    vi.stubGlobal("openai", { openExternal });
    const adaptor = new HostAdaptor();
    adaptor.openExternal("https://x", { redirectUrl: false });
    expect(openExternal).toHaveBeenCalledWith({
      href: "https://x",
      redirectUrl: false,
    });
  });

  it("openExternal uses mcp.openLink for default case", async () => {
    vi.stubGlobal("openai", undefined);
    const adaptor = new HostAdaptor();
    const openLink = vi.fn();
    // biome-ignore lint/suspicious/noExplicitAny: test seam
    (adaptor as any).mcp.getApp = vi
      .fn()
      .mockResolvedValue({ openLink });
    adaptor.openExternal("https://x");
    // openExternal is sync but mcp.openLink resolves async
    await new Promise((r) => setTimeout(r, 0));
    expect(openLink).toHaveBeenCalledWith({ url: "https://x" });
  });
});
