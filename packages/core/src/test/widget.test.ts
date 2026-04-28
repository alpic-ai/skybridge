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
  "src/widgets/my-widget.tsx": { file: "my-widget.js" },
  "src/widgets/folder-widget/index.tsx": { file: "folder-widget.js" },
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

describe("McpServer.registerWidget", () => {
  let server: McpServer;
  let mockRegisterResource: MockInstance<McpServer["registerResource"]>;
  let mockRegisterTool: MockInstance<McpServer["registerTool"]>;

  beforeEach(() => {
    ({ server, mockRegisterResource, mockRegisterTool } =
      createMockMcpServer());
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
    resetTestEnv();
  });

  it("should generate correct HTML for development mode", async () => {
    setTestEnv({ NODE_ENV: "development" });

    const mockToolCallback = vi.fn();
    const mockRegisterResourceConfig = { description: "Test widget" };
    const mockToolConfig = { description: "Test tool" };

    server.registerWidget(
      "my-widget",
      mockRegisterResourceConfig,
      mockToolConfig,
      mockToolCallback,
    );

    // Get the resource callback function
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

    // Check development-specific content
    expect(result.contents[0]?.text).toContain(
      `${serverUrl}/assets/@react-refresh`,
    );
    expect(result.contents[0]?.text).toContain(`${serverUrl}/@vite/client`);
    expect(result.contents[0]?.text).toContain(
      `${serverUrl}/src/widgets/my-widget`,
    );
    expect(result.contents[0]?.text).not.toContain(
      `${serverUrl}/src/widgets/my-widget.tsx`,
    );
  });

  it("should generate correct HTML for production mode", async () => {
    setTestEnv({ NODE_ENV: "production" });

    const mockToolCallback = vi.fn();
    const mockRegisterResourceConfig = { description: "Test widget" };
    const mockToolConfig = { description: "Test tool" };

    server.registerWidget(
      "my-widget",
      mockRegisterResourceConfig,
      mockToolConfig,
      mockToolCallback,
    );

    // Get the resource callback function
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

    // Check production-specific content
    expect(result.contents[0]?.text).not.toContain(
      `${serverUrl}/assets/@react-refresh`,
    );
    expect(result.contents[0]?.text).not.toContain(`${serverUrl}@vite/client`);
    expect(result.contents[0]?.text).toContain(
      `${serverUrl}/assets/my-widget.js`,
    );
    expect(result.contents[0]?.text).toContain(`${serverUrl}/assets/style.css`);
  });

  it("should prefer x-alpic-forwarded-url when hashing Claude widget domains", async () => {
    setTestEnv({ NODE_ENV: "production" });

    const mockToolCallback = vi.fn();
    server.registerWidget(
      "my-widget",
      { description: "Test widget" },
      { description: "Test tool" },
      mockToolCallback,
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
        },
        domain: expectedDomain,
      },
    });
  });

  it("should resolve folder-based widgets (barrel files) in production mode", async () => {
    setTestEnv({ NODE_ENV: "production" });

    const mockToolCallback = vi.fn();
    const mockRegisterResourceConfig = { description: "Folder widget" };
    const mockToolConfig = { description: "Folder tool" };

    server.registerWidget(
      "folder-widget",
      mockRegisterResourceConfig,
      mockToolConfig,
      mockToolCallback,
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
      new URL("ui://widgets/apps-sdk/folder-widget.html"),
      mockExtra,
    );

    // Should resolve to folder-widget.js from the manifest entry "src/widgets/folder-widget/index.tsx"
    expect(result.contents[0]?.text).toContain(
      `${serverUrl}/assets/folder-widget.js`,
    );
  });

  it("should register resources with correct hostType for both apps-sdk and ext-apps formats", async () => {
    const mockToolCallback = vi.fn();
    const mockRegisterResourceConfig = {
      description: "Test widget",
      _meta: { "openai/widgetPrefersBorder": true },
    };
    const mockToolConfig = { description: "Test tool" };

    server.registerWidget(
      "my-widget",
      mockRegisterResourceConfig,
      mockToolConfig,
      mockToolCallback,
    );

    expect(mockRegisterResource).toHaveBeenCalledTimes(2);

    const appsSdkCallback = mockRegisterResource.mock
      .calls[0]?.[3] as unknown as (
      uri: URL,
      extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
    ) => Promise<{
      contents: Array<{ uri: URL | string; mimeType: string; text?: string }>;
    }>;
    const appsSdkResult = await appsSdkCallback(
      new URL("ui://widgets/apps-sdk/my-widget.html"),
      createMockExtra("localhost:3000") as unknown as RequestHandlerExtra<
        ServerRequest,
        ServerNotification
      >,
    );
    const host = "localhost:3000";
    const serverUrl = `http://${host}`;
    const hmrUrl = `ws://${host}`;

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
              },
              domain: serverUrl,
            },
          },
        },
      ],
    });
    expect(extAppsResult.contents[0]?.text).toContain(
      'window.skybridge = { hostType: "mcp-app", serverUrl: "http://localhost:3000" };',
    );
  });

  it("should register tool with ui.resourceUri metadata (not deprecated ui/resourceUri)", async () => {
    const mockToolCallback = vi.fn();
    const mockRegisterResourceConfig = { description: "Test widget" };
    const mockToolConfig = { description: "Test tool" };

    server.registerWidget(
      "my-widget",
      mockRegisterResourceConfig,
      mockToolConfig,
      mockToolCallback,
    );

    expect(mockRegisterTool).toHaveBeenCalledTimes(1);

    const toolCallArgs = mockRegisterTool.mock.calls[0];
    const toolConfig = toolCallArgs?.[1] as { _meta?: Record<string, unknown> };

    expect(toolConfig._meta).toHaveProperty("ui");
    expect(toolConfig._meta?.ui).toEqual({
      resourceUri: "ui://widgets/ext-apps/my-widget.html",
    });
  });

  it("should apply meta overrides in correct priority: defaults < ui.* < direct openai/* keys", async () => {
    const mockToolCallback = vi.fn();
    const mockRegisterResourceConfig = {
      description: "Test widget",
      _meta: {
        // ui.csp overrides (middle priority)
        ui: {
          csp: {
            resourceDomains: ["https://from-ui-csp.com"],
            connectDomains: ["https://from-ui-csp.com"],
          },
          domain: "https://from-ui-domain.com",
          prefersBorder: false,
        },
        // Direct openai/* keys (highest priority) - should override ui.*
        "openai/widgetDomain": "https://direct-override.com",
        "openai/widgetPrefersBorder": true,
      },
    };
    const mockToolConfig = { description: "Test tool" };

    server.registerWidget(
      "override-test",
      mockRegisterResourceConfig,
      mockToolConfig,
      mockToolCallback,
    );

    const appsSdkCallback = mockRegisterResource.mock
      .calls[0]?.[3] as unknown as (
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
    const host = `localhost:3000`;
    const serverUrl = `http://${host}`;
    const hmrUrl = `ws://${host}`;

    const result = await appsSdkCallback(
      new URL("ui://widgets/apps-sdk/override-test.html"),
      createMockExtra(host) as unknown as RequestHandlerExtra<
        ServerRequest,
        ServerNotification
      >,
    );

    const meta = result.contents[0]?._meta as Record<string, unknown>;

    // CSP arrays are merged with union - all unique domains from defaults and user config are preserved
    expect(meta["openai/widgetCSP"]).toEqual({
      resource_domains: [serverUrl, "https://from-ui-csp.com"],
      connect_domains: [serverUrl, hmrUrl, "https://from-ui-csp.com"],
      frame_domains: undefined,
      redirect_domains: undefined,
    });

    // Domain should be overridden by direct openai/* key (highest priority)
    expect(meta["openai/widgetDomain"]).toBe("https://direct-override.com");

    // PrefersBorder should be overridden by direct openai/* key (highest priority)
    expect(meta["openai/widgetPrefersBorder"]).toBe(true);

    // Description should be from defaults (toolConfig.description)
    expect(meta["openai/widgetDescription"]).toBe("Test widget");
  });

  it("should register tool with ui.resourceUri metadata only", async () => {
    const mockToolCallback = vi.fn();
    server.registerWidget(
      "my-widget",
      { description: "Test widget", hosts: ["mcp-app"] },
      { description: "Test tool" },
      mockToolCallback,
    );

    expect(mockRegisterTool).toHaveBeenCalledTimes(1);

    const toolCallArgs = mockRegisterTool.mock.calls[0];
    const toolConfig = toolCallArgs?.[1] as { _meta?: Record<string, unknown> };

    expect(toolConfig._meta).toHaveProperty("ui");
    expect(toolConfig._meta?.ui).toEqual({
      resourceUri: "ui://widgets/ext-apps/my-widget.html",
    });
    expect(toolConfig._meta?.["openai/outputTemplate"]).to.be.undefined;
  });

  it("should inject viewUUID into _meta of tool callback results", async () => {
    const mockToolCallback = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "result" }],
      structuredContent: { data: "test" },
    });

    server.registerWidget(
      "my-widget",
      { description: "Test widget" },
      { description: "Test tool" },
      mockToolCallback,
    );

    // The registerTool should have been called with a wrapped callback
    const wrappedCallback = mockRegisterTool.mock.calls[0]?.[2] as (
      ...args: unknown[]
    ) => Promise<{ _meta?: Record<string, unknown> }>;
    expect(wrappedCallback).toBeDefined();

    const result = await wrappedCallback({}, {});

    expect(result._meta).toBeDefined();
    expect(result._meta?.viewUUID).toBeDefined();
    expect(typeof result._meta?.viewUUID).toBe("string");
    // UUID v4 format
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

    server.registerWidget(
      "my-widget",
      { description: "Test widget" },
      { description: "Test tool" },
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

    server.registerWidget(
      "my-widget",
      { description: "Test widget" },
      { description: "Test tool" },
      mockToolCallback,
    );

    const wrappedCallback = mockRegisterTool.mock.calls[0]?.[2] as (
      ...args: unknown[]
    ) => Promise<{ _meta?: Record<string, unknown> }>;
    const result1 = await wrappedCallback({}, {});
    const result2 = await wrappedCallback({}, {});

    expect(result1._meta?.viewUUID).not.toBe(result2._meta?.viewUUID);
  });

  it("should register tool with uopenai/outputTemplate metadata only", async () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);

    const mockToolCallback = vi.fn();
    server.registerWidget(
      "my-widget",
      { description: "Test widget", hosts: ["apps-sdk"] },
      { description: "Test tool" },
      mockToolCallback,
    );

    expect(mockRegisterTool).toHaveBeenCalledTimes(1);

    const toolCallArgs = mockRegisterTool.mock.calls[0];
    const toolConfig = toolCallArgs?.[1] as { _meta?: Record<string, unknown> };

    expect(toolConfig._meta).not.toHaveProperty("ui");
    expect(toolConfig._meta?.["openai/outputTemplate"]).to.eq(
      `ui://widgets/apps-sdk/my-widget.html?v=${now}`,
    );
  });
});
