import crypto from "node:crypto";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from "vitest";
import type { McpServer } from "../server/server.js";
import {
  createMockExtra,
  createMockMcpServer,
  resetTestEnv,
  setTestEnv,
} from "./utils.js";

const mockManifest = {
  "skybridge:widget:my-widget": {
    file: "assets/my-widget-abc123.js",
    name: "my-widget",
    isEntry: true,
  },
  "skybridge:widget:folder-widget": {
    file: "assets/folder-widget-def456.js",
    name: "folder-widget",
    isEntry: true,
  },
  "style.css": { file: "style.css" },
};

const actual = vi.hoisted(() => require("node:fs"));

vi.mock("node:fs", () => {
  const readFileSyncImpl = (
    path: Parameters<typeof actual.readFileSync>[0],
    ...args: unknown[]
  ): ReturnType<typeof actual.readFileSync> => {
    if (typeof path === "string" && path.includes("manifest.json")) {
      return JSON.stringify(mockManifest) as ReturnType<
        typeof actual.readFileSync
      >;
    }
    return actual.readFileSync(path, ...args);
  };
  const readFileSync = vi.fn(readFileSyncImpl) as typeof actual.readFileSync;

  return {
    readFileSync,
    default: {
      readFileSync,
    },
  };
});

describe("McpServer.registerTool (unified API)", () => {
  let server: McpServer;
  let mockRegisterResource: MockInstance<McpServer["registerResource"]>;
  let mockRegisterTool: MockInstance;

  beforeEach(() => {
    ({ server, mockRegisterResource, mockRegisterTool } =
      createMockMcpServer());
  });

  afterEach(() => {
    vi.clearAllMocks();
    resetTestEnv();
  });

  it("should generate correct HTML for development mode", async () => {
    setTestEnv({ NODE_ENV: "development" });

    server.registerTool(
      {
        name: "my-widget",
        description: "Test tool",
        view: {
          component: "my-widget",
          description: "Test widget",
        },
      },
      vi.fn(),
    );

    const appsSdkResourceCallback = mockRegisterResource.mock
      .calls[0]?.[3] as unknown as (
      uri: URL,
      extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
    ) => Promise<{
      contents: Array<{ uri: URL | string; mimeType: string; text?: string }>;
    }>;
    expect(appsSdkResourceCallback).toBeDefined();

    const host = "localhost:3000";
    const serverUrl = `http://${host}`;
    const hmrUrl = `ws://${host}`;
    const mockExtra = createMockExtra(host) as unknown as RequestHandlerExtra<
      ServerRequest,
      ServerNotification
    >;
    const result = await appsSdkResourceCallback(
      new URL("ui://widgets/apps-sdk/my-widget.html"),
      mockExtra,
    );

    expect(mockRegisterTool).toHaveBeenCalled();
    expect(result).toEqual({
      contents: [
        {
          uri: "ui://widgets/apps-sdk/my-widget.html",
          mimeType: "text/html+skybridge",
          text: expect.stringContaining('<div id="root"></div>'),
          _meta: {
            "openai/widgetCSP": {
              resource_domains: [serverUrl],
              connect_domains: [serverUrl, hmrUrl],
            },
            "openai/widgetDomain": serverUrl,
            "openai/widgetDescription": "Test widget",
          },
        },
      ],
    });

    expect(result.contents[0]?.text).toContain(
      `${serverUrl}/assets/@react-refresh`,
    );
    expect(result.contents[0]?.text).toContain(`${serverUrl}/@vite/client`);
    expect(result.contents[0]?.text).toContain(
      `${serverUrl}/_skybridge/widget/my-widget`,
    );
  });

  it("should generate correct HTML for production mode", async () => {
    setTestEnv({ NODE_ENV: "production" });

    server.registerTool(
      {
        name: "my-widget",
        description: "Test tool",
        view: {
          component: "my-widget",
          description: "Test widget",
        },
      },
      vi.fn(),
    );

    const appsSdkResourceCallback = mockRegisterResource.mock
      .calls[0]?.[3] as unknown as (
      uri: URL,
      extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
    ) => Promise<{
      contents: Array<{ uri: URL | string; mimeType: string; text?: string }>;
    }>;
    expect(appsSdkResourceCallback).toBeDefined();

    const host = "myapp.com";
    const serverUrl = `https://${host}`;
    const mockExtra = createMockExtra(host) as unknown as RequestHandlerExtra<
      ServerRequest,
      ServerNotification
    >;
    const result = await appsSdkResourceCallback(
      new URL("ui://widgets/apps-sdk/my-widget.html"),
      mockExtra,
    );

    expect(result).toEqual({
      contents: [
        {
          uri: "ui://widgets/apps-sdk/my-widget.html",
          mimeType: "text/html+skybridge",
          text: expect.stringContaining('<div id="root"></div>'),
          _meta: {
            "openai/widgetCSP": {
              resource_domains: [serverUrl],
              connect_domains: [serverUrl],
            },
            "openai/widgetDomain": serverUrl,
            "openai/widgetDescription": "Test widget",
          },
        },
      ],
    });

    expect(result.contents[0]?.text).not.toContain(
      `${serverUrl}/assets/@react-refresh`,
    );
    expect(result.contents[0]?.text).not.toContain(`${serverUrl}@vite/client`);
    expect(result.contents[0]?.text).toContain(
      `${serverUrl}/assets/assets/my-widget-abc123.js`,
    );
    expect(result.contents[0]?.text).toContain(`${serverUrl}/assets/style.css`);
  });

  it("should prefer x-alpic-forwarded-url when hashing Claude widget domains", async () => {
    setTestEnv({ NODE_ENV: "production" });

    server.registerTool(
      {
        name: "my-widget",
        description: "Test tool",
        view: { component: "my-widget", description: "Test widget" },
      },
      vi.fn(),
    );

    const extAppsResourceCallback = mockRegisterResource.mock
      .calls[1]?.[3] as unknown as (
      uri: URL,
      extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
    ) => Promise<{
      contents: Array<{
        uri: URL | string;
        mimeType: string;
        text?: string;
        _meta?: Record<string, unknown>;
      }>;
    }>;
    expect(extAppsResourceCallback).toBeDefined();

    const forwardedUrl =
      "https://everything-3a2c1264.staging.alpic.live/mcp?foo=bar";
    const expectedDomain = `${crypto
      .createHash("sha256")
      .update(forwardedUrl)
      .digest("hex")
      .slice(0, 32)}.claudemcpcontent.com`;

    const result = await extAppsResourceCallback(
      new URL("ui://widgets/ext-apps/my-widget.html"),
      createMockExtra("localhost:3000", {
        headers: {
          "user-agent": "Claude-User",
          "x-alpic-forwarded-url": forwardedUrl,
        },
        url: "http://localhost:3000/mcp",
      }) as unknown as RequestHandlerExtra<ServerRequest, ServerNotification>,
    );

    expect(result.contents[0]?._meta).toEqual({
      ui: {
        csp: {
          resourceDomains: ["http://localhost:3000"],
          connectDomains: ["http://localhost:3000"],
          baseUriDomains: ["http://localhost:3000"],
        },
        description: "Test widget",
        domain: expectedDomain,
      },
    });
  });

  it("should register resources with correct hostType for both apps-sdk and ext-apps", async () => {
    server.registerTool(
      {
        name: "my-widget",
        description: "Test tool",
        view: {
          component: "my-widget",
          description: "Test widget",
          prefersBorder: true,
        },
      },
      vi.fn(),
    );

    expect(mockRegisterResource).toHaveBeenCalledTimes(2);

    const appsSdkCallback = mockRegisterResource.mock
      .calls[0]?.[3] as unknown as (
      uri: URL,
      extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
    ) => Promise<{
      contents: Array<{ uri: URL | string; mimeType: string; text?: string }>;
    }>;
    const host = "localhost:3000";
    const serverUrl = `http://${host}`;
    const hmrUrl = `ws://${host}`;

    const appsSdkResult = await appsSdkCallback(
      new URL("ui://widgets/apps-sdk/my-widget.html"),
      createMockExtra(host) as unknown as RequestHandlerExtra<
        ServerRequest,
        ServerNotification
      >,
    );

    expect(appsSdkResult).toEqual({
      contents: [
        {
          uri: "ui://widgets/apps-sdk/my-widget.html",
          mimeType: "text/html+skybridge",
          text: expect.stringContaining('<div id="root"></div>'),
          _meta: {
            "openai/widgetCSP": {
              resource_domains: [serverUrl],
              connect_domains: [serverUrl, hmrUrl],
            },
            "openai/widgetDomain": serverUrl,
            "openai/widgetDescription": "Test widget",
            "openai/widgetPrefersBorder": true,
          },
        },
      ],
    });
    expect(appsSdkResult.contents[0]?.text).toContain(
      'window.skybridge = { hostType: "apps-sdk", serverUrl: "http://localhost:3000" };',
    );

    const extAppsResourceCallback = mockRegisterResource.mock
      .calls[1]?.[3] as unknown as (
      uri: URL,
      extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
    ) => Promise<{
      contents: Array<{
        uri: URL | string;
        mimeType: string;
        text?: string;
        _meta?: Record<string, unknown>;
      }>;
    }>;
    expect(extAppsResourceCallback).toBeDefined();

    const extAppsResult = await extAppsResourceCallback(
      new URL("ui://widgets/ext-apps/my-widget.html"),
      createMockExtra(host) as unknown as RequestHandlerExtra<
        ServerRequest,
        ServerNotification
      >,
    );

    expect(extAppsResult).toEqual({
      contents: [
        {
          uri: "ui://widgets/ext-apps/my-widget.html",
          mimeType: "text/html;profile=mcp-app",
          text: expect.stringContaining('<div id="root"></div>'),
          _meta: {
            ui: {
              csp: {
                resourceDomains: [serverUrl],
                connectDomains: [serverUrl, hmrUrl],
                baseUriDomains: [serverUrl],
              },
              domain: serverUrl,
              description: "Test widget",
              prefersBorder: true,
            },
          },
        },
      ],
    });
    expect(extAppsResult.contents[0]?.text).toContain(
      'window.skybridge = { hostType: "mcp-app", serverUrl: "http://localhost:3000" };',
    );
  });

  it("should register tool with ui.resourceUri metadata", async () => {
    server.registerTool(
      {
        name: "my-widget",
        description: "Test tool",
        view: { component: "my-widget", description: "Test widget" },
      },
      vi.fn(),
    );

    expect(mockRegisterTool).toHaveBeenCalledTimes(1);

    const toolCallArgs = mockRegisterTool.mock.calls[0];
    const toolConfig = toolCallArgs?.[1] as { _meta?: Record<string, unknown> };

    expect(toolConfig._meta).toHaveProperty("ui");
    expect(toolConfig._meta?.ui).toEqual({
      resourceUri: "ui://widgets/ext-apps/my-widget.html",
    });
  });

  it("should register tool with openai/outputTemplate when apps-sdk only", async () => {
    server.registerTool(
      {
        name: "my-widget",
        description: "Test tool",
        view: {
          component: "my-widget",
          description: "Test widget",
          hosts: ["apps-sdk"],
        },
      },
      vi.fn(),
    );

    expect(mockRegisterTool).toHaveBeenCalledTimes(1);

    const toolCallArgs = mockRegisterTool.mock.calls[0];
    const toolConfig = toolCallArgs?.[1] as { _meta?: Record<string, unknown> };

    expect(toolConfig._meta).not.toHaveProperty("ui");
    expect(toolConfig._meta?.["openai/outputTemplate"]).toBe(
      "ui://widgets/apps-sdk/my-widget.html",
    );
  });

  it("should register tool with ui.resourceUri only when mcp-app only", async () => {
    server.registerTool(
      {
        name: "my-widget",
        description: "Test tool",
        view: {
          component: "my-widget",
          description: "Test widget",
          hosts: ["mcp-app"],
        },
      },
      vi.fn(),
    );

    expect(mockRegisterTool).toHaveBeenCalledTimes(1);

    const toolCallArgs = mockRegisterTool.mock.calls[0];
    const toolConfig = toolCallArgs?.[1] as { _meta?: Record<string, unknown> };

    expect(toolConfig._meta).toHaveProperty("ui");
    expect(toolConfig._meta?.ui).toEqual({
      resourceUri: "ui://widgets/ext-apps/my-widget.html",
    });
    expect(toolConfig._meta?.["openai/outputTemplate"]).toBeUndefined();
  });

  it("should inject viewUUID into _meta of tool callback results", async () => {
    const mockToolCallback = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "result" }],
      structuredContent: { data: "test" },
    });

    server.registerTool(
      {
        name: "my-widget",
        description: "Test tool",
        view: { component: "my-widget", description: "Test widget" },
      },
      mockToolCallback,
    );

    const wrappedCallback = mockRegisterTool.mock.calls[0]?.[2] as (
      ...args: unknown[]
    ) => Promise<{ _meta?: Record<string, unknown> }>;
    expect(wrappedCallback).toBeDefined();

    const result = await wrappedCallback({}, {});

    expect(result._meta).toBeDefined();
    expect(result._meta?.viewUUID).toBeDefined();
    expect(typeof result._meta?.viewUUID).toBe("string");
    expect(result._meta?.viewUUID).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("should preserve existing _meta when injecting viewUUID", async () => {
    const mockToolCallback = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "result" }],
      structuredContent: { data: "test" },
      _meta: { requestId: "req-123", cached: true },
    });

    server.registerTool(
      {
        name: "my-widget",
        description: "Test tool",
        view: { component: "my-widget", description: "Test widget" },
      },
      mockToolCallback,
    );

    const wrappedCallback = mockRegisterTool.mock.calls[0]?.[2] as (
      ...args: unknown[]
    ) => Promise<{ _meta?: Record<string, unknown> }>;
    const result = await wrappedCallback({}, {});

    expect(result._meta?.requestId).toBe("req-123");
    expect(result._meta?.cached).toBe(true);
    expect(result._meta?.viewUUID).toBeDefined();
  });

  it("should generate unique viewUUIDs across calls", async () => {
    const mockToolCallback = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "result" }],
      structuredContent: {},
    });

    server.registerTool(
      {
        name: "my-widget",
        description: "Test tool",
        view: { component: "my-widget", description: "Test widget" },
      },
      mockToolCallback,
    );

    const wrappedCallback = mockRegisterTool.mock.calls[0]?.[2] as (
      ...args: unknown[]
    ) => Promise<{ _meta?: Record<string, unknown> }>;
    const result1 = await wrappedCallback({}, {});
    const result2 = await wrappedCallback({}, {});

    expect(result1._meta?.viewUUID).not.toBe(result2._meta?.viewUUID);
  });

  it("should enforce one-tool-per-widget constraint", () => {
    server.registerTool(
      {
        name: "shake",
        description: "First tool",
        view: { component: "magic-8-ball" },
      },
      vi.fn(),
    );

    expect(() => {
      server.registerTool(
        {
          name: "shake-v2",
          description: "Second tool",
          view: { component: "magic-8-ball" },
        },
        vi.fn(),
      );
    }).toThrow(
      'skybridge: widget "magic-8-ball" is already used by tool "shake"',
    );
  });

  it("should normalize string content to ContentBlock array", async () => {
    const mockToolCallback = vi.fn().mockResolvedValue({
      content: "Hello world",
      structuredContent: {},
    });

    server.registerTool(
      {
        name: "string-content",
        description: "Test tool",
        view: { component: "string-content" },
      },
      mockToolCallback,
    );

    const wrappedCallback = mockRegisterTool.mock.calls[0]?.[2] as (
      ...args: unknown[]
    ) => Promise<{ content: unknown[] }>;
    const result = await wrappedCallback({}, {});

    expect(result.content).toEqual([{ type: "text", text: "Hello world" }]);
  });

  it("should normalize single ContentBlock to array", async () => {
    const mockToolCallback = vi.fn().mockResolvedValue({
      content: { type: "text", text: "Single block" },
      structuredContent: {},
    });

    server.registerTool(
      {
        name: "single-block",
        description: "Test tool",
        view: { component: "single-block" },
      },
      mockToolCallback,
    );

    const wrappedCallback = mockRegisterTool.mock.calls[0]?.[2] as (
      ...args: unknown[]
    ) => Promise<{ content: unknown[] }>;
    const result = await wrappedCallback({}, {});

    expect(result.content).toEqual([{ type: "text", text: "Single block" }]);
  });

  it("should pass through ContentBlock array unchanged", async () => {
    const blocks = [
      { type: "text", text: "A" },
      { type: "text", text: "B" },
    ];
    const mockToolCallback = vi.fn().mockResolvedValue({
      content: blocks,
      structuredContent: {},
    });

    server.registerTool(
      {
        name: "array-content",
        description: "Test tool",
        view: { component: "array-content" },
      },
      mockToolCallback,
    );

    const wrappedCallback = mockRegisterTool.mock.calls[0]?.[2] as (
      ...args: unknown[]
    ) => Promise<{ content: unknown[] }>;
    const result = await wrappedCallback({}, {});

    expect(result.content).toEqual(blocks);
  });

  it("should register tool without view (no resource registration)", () => {
    server.registerTool(
      {
        name: "plain-tool",
        description: "No widget",
      },
      vi.fn(),
    );

    expect(mockRegisterResource).not.toHaveBeenCalled();
    expect(mockRegisterTool).toHaveBeenCalledTimes(1);
  });

  it("should apply view.csp fields to resource _meta", async () => {
    server.registerTool(
      {
        name: "csp-tool",
        description: "Test tool",
        view: {
          component: "csp-tool",
          description: "Test widget",
          csp: {
            connectDomains: ["https://api.example.com"],
            resourceDomains: ["https://cdn.example.com"],
          },
        },
      },
      vi.fn(),
    );

    const appsSdkCallback = mockRegisterResource.mock
      .calls[0]?.[3] as unknown as (
      uri: URL,
      extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
    ) => Promise<{
      contents: Array<{
        uri: URL | string;
        mimeType: string;
        _meta?: Record<string, unknown>;
      }>;
    }>;

    const host = "localhost:3000";
    const serverUrl = `http://${host}`;
    const hmrUrl = `ws://${host}`;
    const result = await appsSdkCallback(
      new URL("ui://widgets/apps-sdk/csp-tool.html"),
      createMockExtra(host) as unknown as RequestHandlerExtra<
        ServerRequest,
        ServerNotification
      >,
    );

    const meta = result.contents[0]?._meta as Record<string, unknown>;
    expect(meta["openai/widgetCSP"]).toEqual({
      resource_domains: [serverUrl, "https://cdn.example.com"],
      connect_domains: [serverUrl, hmrUrl, "https://api.example.com"],
    });
  });

  it("should let view._meta override framework-computed keys", async () => {
    server.registerTool(
      {
        name: "override-tool",
        description: "Test tool",
        view: {
          component: "override-tool",
          description: "Test widget",
          csp: { connectDomains: ["https://api.x.com"] },
          _meta: {
            "openai/widgetCSP": {
              connect_domains: ["https://api.y.com"],
            },
          },
        },
      },
      vi.fn(),
    );

    const appsSdkCallback = mockRegisterResource.mock
      .calls[0]?.[3] as unknown as (
      uri: URL,
      extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
    ) => Promise<{
      contents: Array<{
        uri: URL | string;
        mimeType: string;
        _meta?: Record<string, unknown>;
      }>;
    }>;

    const result = await appsSdkCallback(
      new URL("ui://widgets/apps-sdk/override-tool.html"),
      createMockExtra("localhost:3000") as unknown as RequestHandlerExtra<
        ServerRequest,
        ServerNotification
      >,
    );

    const meta = result.contents[0]?._meta as Record<string, unknown>;
    expect(meta["openai/widgetCSP"]).toEqual({
      connect_domains: ["https://api.y.com"],
    });
  });

  it("should pass user _meta keys through to tool config", () => {
    server.registerTool(
      {
        name: "meta-tool",
        description: "Test tool",
        _meta: {
          "openai/widgetAccessible": true,
          "openai/toolInvocation/invoking": "Loading...",
          "acme.com/category": "utility",
        },
      },
      vi.fn(),
    );

    const toolCallArgs = mockRegisterTool.mock.calls[0];
    const toolConfig = toolCallArgs?.[1] as { _meta?: Record<string, unknown> };

    expect(toolConfig._meta?.["openai/widgetAccessible"]).toBe(true);
    expect(toolConfig._meta?.["openai/toolInvocation/invoking"]).toBe(
      "Loading...",
    );
    expect(toolConfig._meta?.["acme.com/category"]).toBe("utility");
  });
});
