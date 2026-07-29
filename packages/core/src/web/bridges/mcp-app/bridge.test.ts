import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MockResizeObserver } from "../../hooks/test/utils.js";
import { McpAppBridge } from "./bridge.js";

describe("McpAppBridge.getInstance", () => {
  beforeEach(() => {
    McpAppBridge.resetInstance();
    vi.stubGlobal("parent", { postMessage: vi.fn() });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    McpAppBridge.resetInstance();
  });

  it("instantiates regardless of injected hostType", () => {
    vi.stubGlobal("skybridge", { hostType: "apps-sdk" });
    expect(() => McpAppBridge.getInstance()).not.toThrow();
  });
});

/** Reply to `ui/initialize` with the given host context so `connect()` resolves. */
function installHostMock(hostContext: Record<string, unknown>) {
  vi.stubGlobal("parent", {
    postMessage: vi.fn((message: { id?: number; method?: string }) => {
      if (message.method === "ui/initialize" && message.id !== undefined) {
        act(() => {
          window.dispatchEvent(
            new MessageEvent("message", {
              source: window.parent,
              data: {
                jsonrpc: "2.0",
                id: message.id,
                result: {
                  protocolVersion: "2025-06-18",
                  hostInfo: { name: "test-host", version: "1.0.0" },
                  hostCapabilities: {},
                  hostContext,
                },
              },
            }),
          );
        });
      }
    }),
  });
}

describe("McpAppBridge host styles", () => {
  beforeEach(() => {
    vi.stubGlobal("skybridge", { hostType: "mcp-app" });
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
    McpAppBridge.resetInstance();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    McpAppBridge.resetInstance();
    const root = document.documentElement;
    root.removeAttribute("data-theme");
    root.style.colorScheme = "";
    root.style.removeProperty("--color-background-primary");
    document.getElementById("__mcp-host-fonts")?.remove();
  });

  it("applies theme, style variables and fonts from the initial host context when enabled", async () => {
    installHostMock({
      theme: "dark",
      styles: {
        variables: {
          "--color-background-primary": "light-dark(#ffffff, #1a1a1a)",
        },
        css: { fonts: "@font-face{font-family:Test;src:url(x)}" },
      },
    });

    await McpAppBridge.getInstance({ applyHostStyles: true }).getApp();

    const root = document.documentElement;
    expect(root.getAttribute("data-theme")).toBe("dark");
    expect(root.style.colorScheme).toBe("dark");
    expect(root.style.getPropertyValue("--color-background-primary")).toBe(
      "light-dark(#ffffff, #1a1a1a)",
    );
    expect(document.getElementById("__mcp-host-fonts")?.textContent).toContain(
      "@font-face",
    );
  });

  it("leaves the document untouched by default even when the host sends styles", async () => {
    installHostMock({
      theme: "dark",
      styles: {
        variables: {
          "--color-background-primary": "light-dark(#ffffff, #1a1a1a)",
        },
        css: { fonts: "@font-face{font-family:Test;src:url(x)}" },
      },
    });

    await McpAppBridge.getInstance().getApp();

    const root = document.documentElement;
    expect(root.getAttribute("data-theme")).toBeNull();
    expect(root.style.getPropertyValue("--color-background-primary")).toBe("");
    expect(document.getElementById("__mcp-host-fonts")).toBeNull();
  });

  it("leaves the document untouched when enabled but the host provides no styles", async () => {
    installHostMock({});

    await McpAppBridge.getInstance({ applyHostStyles: true }).getApp();

    expect(document.documentElement.getAttribute("data-theme")).toBeNull();
    expect(document.getElementById("__mcp-host-fonts")).toBeNull();
  });
});
