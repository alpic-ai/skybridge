import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HostAdaptor } from "../bridges/adaptor.js";
import { getAdaptor } from "../bridges/get-adaptor.js";
import { McpAppBridge } from "../bridges/mcp-app/bridge.js";
import { useFileResource } from "./use-file-resource.js";

describe("useFileResource", () => {
  beforeEach(() => {
    vi.stubGlobal("parent", { postMessage: vi.fn() });
    vi.stubGlobal("skybridge", {});
    vi.stubGlobal("openai", undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    HostAdaptor.resetInstance();
    McpAppBridge.resetInstance();
  });

  it("reads the resource, re-reads it on update and writes with the current etag", async () => {
    let version = 1;
    let onUpdated: (notification: { params: { uri: string } }) => void =
      () => {};
    const request = vi.fn(async ({ method }: { method: string }) =>
      method === "openai/resources/write"
        ? { outcome: "saved", etag: "v3" }
        : {},
    );
    const app = {
      getHostCapabilities: () => ({ experimental: { "openai/resource": {} } }),
      readServerResource: vi.fn(async ({ uri }: { uri: string }) => ({
        contents: [
          {
            uri,
            text: `version ${version}`,
            _meta: {
              "openai/resource": { writable: true, etag: `v${version}` },
            },
          },
        ],
      })),
      setNotificationHandler: (_method: string, handler: typeof onUpdated) => {
        onUpdated = handler;
      },
      request,
    };
    (
      getAdaptor() as unknown as { mcp: { getApp: () => Promise<object> } }
    ).mcp.getApp = () => Promise.resolve(app);

    const { result } = renderHook(() =>
      useFileResource("host-resource://part", { representation: "text" }),
    );
    await waitFor(() =>
      expect(result.current.data).toMatchObject({
        text: "version 1",
        etag: "v1",
      }),
    );
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        {
          method: "resources/subscribe",
          params: { uri: "host-resource://part" },
        },
        expect.anything(),
      ),
    );

    version = 2;
    act(() => onUpdated({ params: { uri: "host-resource://part" } }));
    await waitFor(() =>
      expect(result.current.data).toMatchObject({ etag: "v2" }),
    );

    await act(async () => {
      await result.current.write({ text: "edited" });
    });
    expect(request).toHaveBeenCalledWith(
      {
        method: "openai/resources/write",
        params: { uri: "host-resource://part", text: "edited", ifMatch: "v2" },
      },
      expect.anything(),
    );
    expect(result.current.data).toMatchObject({ text: "edited", etag: "v3" });
  });
});
