import crypto from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
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
import type { McpServer, ViewName } from "../server/server.js";
import { McpServer as McpServerClass } from "../server/server.js";
import {
  createMockExtra,
  createMockMcpServer,
  resetTestEnv,
  setTestEnv,
} from "./utils.js";

const mockManifest = {
  "skybridge:view:my-view": {
    file: "assets/my-view-abc123.js",
    name: "my-view",
    isEntry: true,
  },
  "skybridge:view:folder-view": {
    file: "assets/folder-view-def456.js",
    name: "folder-view",
    isEntry: true,
  },
  "style.css": { file: "style.css" },
};

// Mirrors `McpServer.computeViewVersionParam`. Tests recompute the expected
// hash from the mocked manifest so they don't hardcode digest output.
function expectedVersionParam(viewFile: string, styleFile: string): string {
  const hash = crypto
    .createHash("sha256")
    .update(viewFile)
    .update("\0")
    .update(styleFile)
    .digest("hex")
    .slice(0, 8);
  return `?v=${hash}`;
}

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
        name: "my-view",
        description: "Test tool",
        view: {
          component: "my-view" as ViewName,
          description: "Test view",
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
      new URL("ui://views/ext-apps/my-view.html"),
      mockExtra,
    );

    expect(mockRegisterTool).toHaveBeenCalled();
    expect(result).toEqual({
      contents: [
        {
          uri: "ui://views/ext-apps/my-view.html",
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
              description: "Test view",
            },
            "openai/widgetDescription": "Test view",
          },
        },
      ],
    });

    expect(result.contents[0]?.text).toContain(
      `${serverUrl}/assets/@react-refresh`,
    );
    expect(result.contents[0]?.text).toContain(`${serverUrl}/@vite/client`);
    expect(result.contents[0]?.text).toContain(
      `${serverUrl}/_skybridge/view/my-view`,
    );
  });

  it("should generate correct HTML for production mode", async () => {
    setTestEnv({ NODE_ENV: "production" });

    server.registerTool(
      {
        name: "my-view",
        description: "Test tool",
        view: {
          component: "my-view" as ViewName,
          description: "Test view",
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
    const versionedUri = `ui://views/ext-apps/my-view.html${expectedVersionParam("assets/my-view-abc123.js", "style.css")}`;
    const result = await appsSdkResourceCallback(
      new URL(versionedUri),
      mockExtra,
    );

    expect(result).toEqual({
      contents: [
        {
          uri: versionedUri,
          mimeType: "text/html;profile=mcp-app",
          text: expect.stringContaining('<div id="root"></div>'),
          _meta: {
            ui: {
              csp: {
                resourceDomains: [serverUrl],
                connectDomains: [serverUrl],
                baseUriDomains: [serverUrl],
              },
              domain: serverUrl,
              description: "Test view",
            },
            "openai/widgetDescription": "Test view",
          },
        },
      ],
    });

    expect(result.contents[0]?.text).not.toContain(
      `${serverUrl}/assets/@react-refresh`,
    );
    expect(result.contents[0]?.text).not.toContain(`${serverUrl}@vite/client`);
    expect(result.contents[0]?.text).toContain(
      `${serverUrl}/assets/assets/my-view-abc123.js`,
    );
    expect(result.contents[0]?.text).toContain(`${serverUrl}/assets/style.css`);
  });

  it("should prefer x-alpic-forwarded-url when hashing Claude view domains", async () => {
    setTestEnv({ NODE_ENV: "production" });

    server.registerTool(
      {
        name: "my-view",
        description: "Test tool",
        view: { component: "my-view" as ViewName, description: "Test view" },
      },
      vi.fn(),
    );

    const extAppsResourceCallback = mockRegisterResource.mock
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
    expect(extAppsResourceCallback).toBeDefined();

    const forwardedUrl =
      "https://everything-3a2c1264.staging.alpic.live/mcp?foo=bar";
    const expectedDomain = `${crypto
      .createHash("sha256")
      .update(forwardedUrl)
      .digest("hex")
      .slice(0, 32)}.claudemcpcontent.com`;

    const result = await extAppsResourceCallback(
      new URL(
        `ui://views/ext-apps/my-view.html${expectedVersionParam("assets/my-view-abc123.js", "style.css")}`,
      ),
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
        description: "Test view",
        domain: expectedDomain,
      },
      "openai/widgetDescription": "Test view",
    });
  });

  it("should register a single ext-apps resource", async () => {
    server.registerTool(
      {
        name: "my-view",
        description: "Test tool",
        view: {
          component: "my-view" as ViewName,
          description: "Test view",
          prefersBorder: true,
        },
      },
      vi.fn(),
    );

    expect(mockRegisterResource).toHaveBeenCalledTimes(1);

    const resourceCallback = mockRegisterResource.mock
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
    const host = "localhost:3000";
    const serverUrl = `http://${host}`;
    const hmrUrl = `ws://${host}`;

    const result = await resourceCallback(
      new URL("ui://views/ext-apps/my-view.html"),
      createMockExtra(host) as unknown as RequestHandlerExtra<
        ServerRequest,
        ServerNotification
      >,
    );

    expect(result).toEqual({
      contents: [
        {
          uri: "ui://views/ext-apps/my-view.html",
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
              description: "Test view",
              prefersBorder: true,
            },
            "openai/widgetDescription": "Test view",
          },
        },
      ],
    });
    expect(result.contents[0]?.text).toContain(
      'window.skybridge = { hostType: "mcp-app", serverUrl: "http://localhost:3000" };',
    );
  });

  it("should advertise the single resource via ui.resourceUri only (no openai/outputTemplate)", async () => {
    server.registerTool(
      {
        name: "my-view",
        description: "Test tool",
        view: { component: "my-view" as ViewName, description: "Test view" },
      },
      vi.fn(),
    );

    const toolConfig = mockRegisterTool.mock.calls[0]?.[1] as {
      _meta?: Record<string, unknown> & { ui?: { resourceUri?: string } };
    };
    const uri = "ui://views/ext-apps/my-view.html";

    expect(toolConfig._meta?.ui?.resourceUri).toBe(uri);
    expect(toolConfig._meta?.["ui/resourceUri"]).toBe(uri);
    expect(toolConfig._meta?.["openai/outputTemplate"]).toBeUndefined();
  });

  it("treats the deprecated hosts option as a no-op (always the single resource)", async () => {
    server.registerTool(
      {
        name: "my-view",
        description: "Test tool",
        view: {
          component: "my-view" as ViewName,
          description: "Test view",
          hosts: ["apps-sdk"],
        },
      },
      vi.fn(),
    );

    expect(mockRegisterResource).toHaveBeenCalledTimes(1);
    const toolConfig = mockRegisterTool.mock.calls[0]?.[1] as {
      _meta?: Record<string, unknown> & { ui?: { resourceUri?: string } };
    };
    expect(toolConfig._meta?.ui?.resourceUri).toBe(
      "ui://views/ext-apps/my-view.html",
    );
    expect(toolConfig._meta?.["openai/outputTemplate"]).toBeUndefined();
  });

  it("should not version view URIs in development", () => {
    server.registerTool(
      {
        name: "my-view",
        description: "Test tool",
        view: { component: "my-view" as ViewName, description: "Test view" },
      },
      vi.fn(),
    );

    const toolConfig = mockRegisterTool.mock.calls[0]?.[1] as {
      _meta?: Record<string, unknown> & { ui?: { resourceUri?: string } };
    };

    expect(toolConfig._meta?.["openai/outputTemplate"]).toBeUndefined();
    expect(toolConfig._meta?.ui?.resourceUri).toBe(
      "ui://views/ext-apps/my-view.html",
    );
    // The URI registered with the resource handler must match ui.resourceUri
    // exactly so the SDK can resolve `resources/read` requests.
    expect(mockRegisterResource.mock.calls[0]?.[1]).toBe(
      "ui://views/ext-apps/my-view.html",
    );
  });

  it("should append a stable content hash to view URIs in production", () => {
    setTestEnv({ NODE_ENV: "production" });

    server.registerTool(
      {
        name: "my-view",
        description: "Test tool",
        view: { component: "my-view" as ViewName, description: "Test view" },
      },
      vi.fn(),
    );

    const expected = expectedVersionParam(
      "assets/my-view-abc123.js",
      "style.css",
    );
    const toolConfig = mockRegisterTool.mock.calls[0]?.[1] as {
      _meta?: Record<string, unknown> & { ui?: { resourceUri?: string } };
    };

    expect(toolConfig._meta?.["openai/outputTemplate"]).toBeUndefined();
    expect(toolConfig._meta?.ui?.resourceUri).toBe(
      `ui://views/ext-apps/my-view.html${expected}`,
    );
    expect(mockRegisterResource.mock.calls[0]?.[1]).toBe(
      `ui://views/ext-apps/my-view.html${expected}`,
    );
  });

  it("should produce different version params for views with different bundles", () => {
    setTestEnv({ NODE_ENV: "production" });

    server.registerTool(
      {
        name: "my-view",
        description: "First tool",
        view: { component: "my-view" as ViewName },
      },
      vi.fn(),
    );
    server.registerTool(
      {
        name: "folder-view",
        description: "Second tool",
        view: { component: "folder-view" as ViewName },
      },
      vi.fn(),
    );

    const myviewTemplate = (
      mockRegisterTool.mock.calls[0]?.[1] as {
        _meta?: { ui?: { resourceUri?: string } };
      }
    )._meta?.ui?.resourceUri;
    const folderviewTemplate = (
      mockRegisterTool.mock.calls[1]?.[1] as {
        _meta?: { ui?: { resourceUri?: string } };
      }
    )._meta?.ui?.resourceUri;

    expect(myviewTemplate).not.toEqual(folderviewTemplate);
    expect(myviewTemplate).toMatch(/\?v=[0-9a-f]{8}$/);
    expect(folderviewTemplate).toMatch(/\?v=[0-9a-f]{8}$/);
  });

  it("should fall back to bare URI in production when manifest is missing", () => {
    setTestEnv({ NODE_ENV: "production" });

    server.registerTool(
      {
        name: "unknown-view",
        description: "Test tool",
        view: { component: "unknown-view" as ViewName },
      },
      vi.fn(),
    );

    const toolConfig = mockRegisterTool.mock.calls[0]?.[1] as {
      _meta?: { ui?: { resourceUri?: string } };
    };
    expect(toolConfig._meta?.ui?.resourceUri).toBe(
      "ui://views/ext-apps/unknown-view.html",
    );
  });

  it("should inject viewUUID into _meta of tool callback results", async () => {
    const mockToolCallback = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "result" }],
      structuredContent: { data: "test" },
    });

    server.registerTool(
      {
        name: "my-view",
        description: "Test tool",
        view: { component: "my-view" as ViewName, description: "Test view" },
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
        name: "my-view",
        description: "Test tool",
        view: { component: "my-view" as ViewName, description: "Test view" },
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
        name: "my-view",
        description: "Test tool",
        view: { component: "my-view" as ViewName, description: "Test view" },
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

  it("should enforce one-tool-per-view constraint", () => {
    server.registerTool(
      {
        name: "shake",
        description: "First tool",
        view: { component: "magic-8-ball" as ViewName },
      },
      vi.fn(),
    );

    expect(() => {
      server.registerTool(
        {
          name: "shake-v2",
          description: "Second tool",
          view: { component: "magic-8-ball" as ViewName },
        },
        vi.fn(),
      );
    }).toThrow(
      'skybridge: view "magic-8-ball" is already used by tool "shake"',
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
        view: { component: "string-content" as ViewName },
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
        view: { component: "single-block" as ViewName },
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
        view: { component: "array-content" as ViewName },
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
        description: "No view",
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
          component: "csp-tool" as ViewName,
          description: "Test view",
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
      new URL("ui://views/ext-apps/csp-tool.html"),
      createMockExtra(host) as unknown as RequestHandlerExtra<
        ServerRequest,
        ServerNotification
      >,
    );

    const meta = result.contents[0]?._meta as {
      ui?: { csp?: Record<string, unknown> };
    };
    expect(meta.ui?.csp).toEqual({
      resourceDomains: [serverUrl, "https://cdn.example.com"],
      connectDomains: [serverUrl, hmrUrl, "https://api.example.com"],
      baseUriDomains: [serverUrl],
    });
  });

  it("should let view._meta override framework-computed keys", async () => {
    server.registerTool(
      {
        name: "override-tool",
        description: "Test tool",
        view: {
          component: "override-tool" as ViewName,
          description: "Test view",
          csp: { connectDomains: ["https://api.x.com"] },
          _meta: {
            ui: {
              csp: {
                connectDomains: ["https://api.y.com"],
              },
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
      new URL("ui://views/ext-apps/override-tool.html"),
      createMockExtra("localhost:3000") as unknown as RequestHandlerExtra<
        ServerRequest,
        ServerNotification
      >,
    );

    const meta = result.contents[0]?._meta as {
      ui?: { csp?: Record<string, unknown> };
    };
    expect(meta.ui?.csp).toEqual({
      connectDomains: ["https://api.y.com"],
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

describe("resources/list view _meta injection", () => {
  afterEach(() => resetTestEnv());

  it("attaches CSP, domain, and connectDomains _meta to view resources at list time", async () => {
    setTestEnv({ NODE_ENV: "production" });

    const server = new McpServerClass(
      { name: "test", version: "1.0.0" },
      { capabilities: {} },
    );
    server.registerTool(
      {
        name: "start",
        description: "Start",
        view: {
          component: "my-view" as ViewName,
          description: "Onboarding deck",
          domain: "skybridge.tech",
          csp: {
            resourceDomains: ["https://fonts.googleapis.com"],
            redirectDomains: ["https://docs.skybridge.tech"],
          },
        },
      },
      vi.fn().mockResolvedValue({
        content: [{ type: "text", text: "ok" }],
        structuredContent: {},
      }),
    );

    const client = new Client({ name: "test-client", version: "1.0.0" });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const { resources } = await client.listResources();
    await client.close();
    await server.close();

    const appsSdk = resources.find((r) => r.uri.includes("apps-sdk"));
    const extApps = resources.find((r) => r.uri.includes("ext-apps"));
    expect(appsSdk).toBeUndefined();
    expect(extApps?._meta).toBeDefined();

    const extUi = (
      extApps?._meta as {
        ui?: {
          csp?: { connectDomains?: string[]; resourceDomains?: string[] };
          domain?: string;
        };
      }
    ).ui;
    expect(extUi?.csp?.connectDomains?.length).toBeGreaterThan(0);
    expect(extUi?.csp?.resourceDomains).toContain(
      "https://fonts.googleapis.com",
    );
    expect(extUi?.domain).toBe("skybridge.tech");

    // ChatGPT-only resource fields with no ui.* equivalent are emitted too.
    const meta = extApps?._meta as {
      "openai/widgetDescription"?: string;
      "openai/widgetCSP"?: { redirect_domains?: string[] };
      ui?: { csp?: Record<string, unknown> };
    };
    expect(meta["openai/widgetDescription"]).toBe("Onboarding deck");
    // redirect_domains is unsupported in ui.csp; ChatGPT reads it only here.
    expect(meta["openai/widgetCSP"]?.redirect_domains).toEqual([
      "https://docs.skybridge.tech",
    ]);
    expect(meta.ui?.csp).not.toHaveProperty("redirectDomains");
  });
});
