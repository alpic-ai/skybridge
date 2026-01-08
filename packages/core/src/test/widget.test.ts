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

    const serverUrl = "http://localhost:3000";
    const mockExtra = createMockExtra(
      "__not_used__",
    ) as unknown as RequestHandlerExtra<ServerRequest, ServerNotification>;
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
            "openai/widgetDescription": "Test tool",
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

    const serverUrl = "https://myapp.com";
    const mockExtra = createMockExtra(
      serverUrl,
    ) as unknown as RequestHandlerExtra<ServerRequest, ServerNotification>;
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
            "openai/widgetDescription": "Test tool",
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

    const serverUrl = "https://myapp.com";
    const mockExtra = createMockExtra(
      serverUrl,
    ) as unknown as RequestHandlerExtra<ServerRequest, ServerNotification>;
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
      createMockExtra("__not_used__") as unknown as RequestHandlerExtra<
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
            "openai/widgetDescription": "Test tool",
            "openai/widgetPrefersBorder": true,
          },
        },
      ],
    });
    expect(appsSdkResult.contents[0]?.text).toContain(
      'window.skybridge = { hostType: "apps-sdk" }',
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
      createMockExtra("__not_used__") as unknown as RequestHandlerExtra<
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
            "openai/widgetDescription": "Test tool",
            "openai/widgetPrefersBorder": true,
          },
        },
      ],
    });
    expect(extAppsResult.contents[0]?.text).toContain(
      'window.skybridge = { hostType: "mcp-app" }',
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
});
