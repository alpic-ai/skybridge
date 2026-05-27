import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HostAdaptor } from "./adaptor.js";
import { AppsSdkBridge } from "./apps-sdk/bridge.js";
import { McpAppBridge } from "./mcp-app/bridge.js";
import { NotSupportedError } from "./types.js";

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

describe("HostAdaptor Apps-SDK-only methods", () => {
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

  it("uploadFile throws NotSupportedError when oai is null", async () => {
    vi.stubGlobal("openai", undefined);
    const adaptor = new HostAdaptor();
    await expect(adaptor.uploadFile(new File([], "x"))).rejects.toThrow(
      NotSupportedError,
    );
  });

  it("uploadFile delegates to oai.uploadFile and tracks fileId", async () => {
    const setWidgetState = vi.fn().mockResolvedValue(undefined);
    const uploadFile = vi
      .fn()
      .mockResolvedValue({ fileId: "abc", fileName: "x" });
    vi.stubGlobal("openai", {
      uploadFile,
      setWidgetState,
      widgetState: null,
    });
    const adaptor = new HostAdaptor();
    const file = new File([], "x");
    const r = await adaptor.uploadFile(file, { library: true });
    expect(uploadFile).toHaveBeenCalledWith(file, { library: true });
    expect(r.fileId).toBe("abc");
    expect(setWidgetState).toHaveBeenCalledWith(
      expect.objectContaining({ imageIds: ["abc"] }),
    );
  });

  it("selectFiles throws when oai is null", async () => {
    vi.stubGlobal("openai", undefined);
    const adaptor = new HostAdaptor();
    await expect(adaptor.selectFiles()).rejects.toThrow(NotSupportedError);
  });

  it("selectFiles throws when host version lacks support", async () => {
    vi.stubGlobal("openai", { selectFiles: undefined });
    const adaptor = new HostAdaptor();
    await expect(adaptor.selectFiles()).rejects.toThrow(/selectFiles/);
  });

  it("getFileDownloadUrl throws when oai is null", async () => {
    vi.stubGlobal("openai", undefined);
    const adaptor = new HostAdaptor();
    await expect(
      adaptor.getFileDownloadUrl({ fileId: "x" }),
    ).rejects.toThrow(NotSupportedError);
  });

  it("setOpenInAppUrl throws when oai is null", async () => {
    vi.stubGlobal("openai", undefined);
    const adaptor = new HostAdaptor();
    await expect(adaptor.setOpenInAppUrl("https://x")).rejects.toThrow(
      NotSupportedError,
    );
  });
});

describe("HostAdaptor setViewState", () => {
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

  it("uses window.openai.setWidgetState when oai is present", async () => {
    const setWidgetState = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("openai", { setWidgetState, widgetState: null });
    const adaptor = new HostAdaptor();
    await adaptor.setViewState({ count: 1 });
    expect(setWidgetState).toHaveBeenCalledWith(
      expect.objectContaining({ modelContent: { count: 1 } }),
    );
  });

  it("calls mcp.updateModelContext and writes localStorage when oai is null", async () => {
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
    const keys = Array.from(
      { length: localStorage.length },
      (_, i) => localStorage.key(i)!,
    );
    expect(keys.some((k) => k.endsWith(":view-1"))).toBe(true);
  });

  it("accepts an updater function form", async () => {
    vi.stubGlobal("openai", undefined);
    const adaptor = new HostAdaptor();
    // biome-ignore lint/suspicious/noExplicitAny: test seam
    (adaptor as any).mcp.getApp = vi.fn().mockResolvedValue({
      updateModelContext: vi.fn().mockResolvedValue(undefined),
    });
    // biome-ignore lint/suspicious/noExplicitAny: test seam
    (adaptor as any)._viewState = { count: 1 };
    await adaptor.setViewState((prev) => ({
      // biome-ignore lint/suspicious/noExplicitAny: test
      count: (prev as any).count + 1,
    }));
    // biome-ignore lint/suspicious/noExplicitAny: test seam
    expect((adaptor as any)._viewState).toEqual({ count: 2 });
  });
});
