import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HostAdaptor } from "./adaptor.js";
import { AppsSdkBridge } from "./apps-sdk/bridge.js";
import { McpAppBridge } from "./mcp-app/bridge.js";
import { NotSupportedError } from "./types.js";

describe("HostAdaptor", () => {
  beforeEach(() => {
    McpAppBridge.resetInstance();
    AppsSdkBridge.resetInstance();
    vi.stubGlobal("skybridge", { hostType: "apps-sdk" });
    vi.stubGlobal("parent", { postMessage: vi.fn() });
    localStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    McpAppBridge.resetInstance();
    AppsSdkBridge.resetInstance();
    localStorage.clear();
  });

  it("captures window.openai as overlay when present, else oai is null", () => {
    vi.stubGlobal("openai", undefined);
    expect(new HostAdaptor().hasAppsSdkOverlay()).toBe(false);
    McpAppBridge.resetInstance();
    AppsSdkBridge.resetInstance();
    vi.stubGlobal("openai", { widgetState: null });
    expect(new HostAdaptor().hasAppsSdkOverlay()).toBe(true);
  });

  it("callTool always routes to mcp.callServerTool", async () => {
    vi.stubGlobal("openai", { callTool: vi.fn() });
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

  it("download returns isError when host lacks downloadFile capability", async () => {
    vi.stubGlobal("openai", undefined);
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

  it("sendFollowUpMessage routes to oai only when scrollToBottom is set", async () => {
    const sendFollowUpMessage = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("openai", { sendFollowUpMessage });
    let adaptor = new HostAdaptor();
    await adaptor.sendFollowUpMessage("hi", { scrollToBottom: false });
    expect(sendFollowUpMessage).toHaveBeenCalledWith({
      prompt: "hi",
      scrollToBottom: false,
    });

    // Default case falls through to MCP
    McpAppBridge.resetInstance();
    AppsSdkBridge.resetInstance();
    vi.stubGlobal("openai", undefined);
    adaptor = new HostAdaptor();
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    // biome-ignore lint/suspicious/noExplicitAny: test seam
    (adaptor as any).mcp.getApp = vi.fn().mockResolvedValue({ sendMessage });
    await adaptor.sendFollowUpMessage("hi");
    expect(sendMessage).toHaveBeenCalledWith({
      role: "user",
      content: [{ type: "text", text: "hi" }],
    });
  });

  it("openExternal routes to oai only when redirectUrl: false", async () => {
    const openExternal = vi.fn();
    vi.stubGlobal("openai", { openExternal });
    let adaptor = new HostAdaptor();
    adaptor.openExternal("https://x", { redirectUrl: false });
    expect(openExternal).toHaveBeenCalledWith({
      href: "https://x",
      redirectUrl: false,
    });

    // Default case falls through to MCP openLink
    McpAppBridge.resetInstance();
    AppsSdkBridge.resetInstance();
    vi.stubGlobal("openai", undefined);
    adaptor = new HostAdaptor();
    const openLink = vi.fn();
    // biome-ignore lint/suspicious/noExplicitAny: test seam
    (adaptor as any).mcp.getApp = vi.fn().mockResolvedValue({ openLink });
    adaptor.openExternal("https://x");
    await new Promise((r) => setTimeout(r, 0));
    expect(openLink).toHaveBeenCalledWith({ url: "https://x" });
  });

  it("Apps-SDK-exclusive methods throw NotSupportedError when oai is null", async () => {
    vi.stubGlobal("openai", undefined);
    const adaptor = new HostAdaptor();
    await expect(adaptor.uploadFile(new File([], "x"))).rejects.toThrow(
      NotSupportedError,
    );
    await expect(adaptor.selectFiles()).rejects.toThrow(NotSupportedError);
    await expect(adaptor.getFileDownloadUrl({ fileId: "x" })).rejects.toThrow(
      NotSupportedError,
    );
    await expect(adaptor.setOpenInAppUrl("https://x")).rejects.toThrow(
      NotSupportedError,
    );
  });

  it("uploadFile delegates to oai.uploadFile and tracks fileId in widgetState", async () => {
    const setWidgetState = vi.fn().mockResolvedValue(undefined);
    const uploadFile = vi
      .fn()
      .mockResolvedValue({ fileId: "abc", fileName: "x" });
    vi.stubGlobal("openai", { uploadFile, setWidgetState, widgetState: null });
    const adaptor = new HostAdaptor();
    const file = new File([], "x");
    const r = await adaptor.uploadFile(file, { library: true });
    expect(uploadFile).toHaveBeenCalledWith(file, { library: true });
    expect(r.fileId).toBe("abc");
    expect(setWidgetState).toHaveBeenCalledWith(
      expect.objectContaining({ imageIds: ["abc"] }),
    );
  });

  it("setViewState uses oai.setWidgetState when present", async () => {
    const setWidgetState = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("openai", { setWidgetState, widgetState: null });
    const adaptor = new HostAdaptor();
    await adaptor.setViewState({ count: 1 });
    expect(setWidgetState).toHaveBeenCalledWith(
      expect.objectContaining({ modelContent: { count: 1 } }),
    );
  });

  it("setViewState falls back to MCP updateModelContext + localStorage when oai is null", async () => {
    vi.stubGlobal("openai", undefined);
    const adaptor = new HostAdaptor();
    const updateModelContext = vi.fn().mockResolvedValue(undefined);
    // biome-ignore lint/suspicious/noExplicitAny: test seam
    (adaptor as any).mcp.getApp = vi
      .fn()
      .mockResolvedValue({ updateModelContext });
    // biome-ignore lint/suspicious/noExplicitAny: test seam
    (adaptor as any)._viewUUID = "view-1";
    await adaptor.setViewState({ count: 2 });
    expect(updateModelContext).toHaveBeenCalledWith({
      structuredContent: { count: 2 },
      content: [{ type: "text", text: JSON.stringify({ count: 2 }) }],
    });
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key !== null) {
        keys.push(key);
      }
    }
    expect(keys.some((k) => k.endsWith(":view-1"))).toBe(true);
  });

  it("openModal/closeModal: delegates to oai.requestModal when present, polyfill state otherwise", () => {
    const requestModal = vi.fn();
    vi.stubGlobal("openai", { requestModal });
    let adaptor = new HostAdaptor();
    adaptor.openModal({ title: "Hi" });
    expect(requestModal).toHaveBeenCalledWith({ title: "Hi" });
    expect(() => adaptor.closeModal()).not.toThrow();

    // Polyfill path
    McpAppBridge.resetInstance();
    AppsSdkBridge.resetInstance();
    vi.stubGlobal("openai", undefined);
    adaptor = new HostAdaptor();
    adaptor.openModal({ params: { x: 1 } });
    // biome-ignore lint/suspicious/noExplicitAny: test seam
    expect((adaptor as any)._polyfillDisplay).toEqual({
      mode: "modal",
      params: { x: 1 },
    });
    adaptor.closeModal();
    // biome-ignore lint/suspicious/noExplicitAny: test seam
    expect((adaptor as any)._polyfillDisplay).toEqual({ mode: "inline" });
  });

  it("getHostContextStore: display/viewState route to oai overlay when present, MCP otherwise", () => {
    vi.stubGlobal("openai", {
      view: { mode: "fullscreen" },
      widgetState: { modelContent: { count: 5 }, privateContent: {} },
    });
    let adaptor = new HostAdaptor();
    expect(adaptor.getHostContextStore("display").getSnapshot()).toEqual({
      mode: "fullscreen",
    });
    expect(adaptor.getHostContextStore("viewState").getSnapshot()).toEqual({
      count: 5,
    });
    // Other keys (theme) always flow through MCP; default fallback when no notification
    expect(adaptor.getHostContextStore("theme").getSnapshot()).toBe("light");

    // Polyfill / local-state path
    McpAppBridge.resetInstance();
    AppsSdkBridge.resetInstance();
    vi.stubGlobal("openai", undefined);
    adaptor = new HostAdaptor();
    expect(adaptor.getHostContextStore("display").getSnapshot()).toEqual({
      mode: "inline",
    });
    expect(adaptor.getHostContextStore("viewState").getSnapshot()).toBe(null);
  });
});
