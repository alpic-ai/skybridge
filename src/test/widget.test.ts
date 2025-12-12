import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { readFileSync } from "node:fs";
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
  "style.css": { file: "style.css" },
};

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  const readFileSync = vi.fn((path: string, ...args: unknown[]) => {
    if (typeof path === "string" && path.includes("manifest.json")) {
      return JSON.stringify(mockManifest);
    }
    return actual.readFileSync(path, ...args);
  });

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
    const resourceCallback = mockRegisterResource.mock.calls[0]?.[3] as (
      uri: URL,
      extra: RequestHandlerExtra,
    ) => Promise<{ contents: Array<{ uri: URL | string; mimeType: string; text?: string }> }>;
    expect(resourceCallback).toBeDefined();

    const serverUrl = "http://localhost:3000";
    const mockExtra = createMockExtra("__not_used__");
    const result = await resourceCallback(
      new URL("ui://widgets/my-widget.html"),
      mockExtra,
    );

    expect(mockRegisterTool).toHaveBeenCalled();
    expect(result).toEqual({
      contents: [
        {
          uri: "ui://widgets/my-widget.html",
          mimeType: "text/html+skybridge",
          text: expect.stringContaining('<div id="root"></div>'),
        },
      ],
    });

    // Check development-specific content
    expect(result.contents[0]?.text).toContain(`${serverUrl}/@react-refresh`);
    expect(result.contents[0]?.text).toContain(`${serverUrl}/@vite/client`);
    expect(result.contents[0]?.text).toContain(
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
    const resourceCallback = mockRegisterResource.mock.calls[0]?.[3] as (
      uri: URL,
      extra: RequestHandlerExtra,
    ) => Promise<{ contents: Array<{ uri: URL | string; mimeType: string; text?: string }> }>;
    expect(resourceCallback).toBeDefined();

    const serverUrl = "https://myapp.com";
    const mockExtra = createMockExtra(serverUrl);
    const result = await resourceCallback?.(
      new URL("ui://widgets/my-widget.html"),
      mockExtra,
    );

    expect(result).toEqual({
      contents: [
        {
          uri: "ui://widgets/my-widget.html",
          mimeType: "text/html+skybridge",
          text: expect.stringContaining('<div id="root"></div>'),
        },
      ],
    });

    // Check production-specific content
    expect(result.contents[0]?.text).not.toContain(
      `${serverUrl}@react-refresh`,
    );
    expect(result.contents[0]?.text).not.toContain(`${serverUrl}@vite/client`);
    expect(result.contents[0]?.text).toContain(
      `${serverUrl}/assets/my-widget.js`,
    );
    expect(result.contents[0]?.text).toContain(`${serverUrl}/assets/style.css`);
  });
});
