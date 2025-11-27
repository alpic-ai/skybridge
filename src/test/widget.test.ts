import * as fs from "node:fs";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";
import { McpServer } from "../server/server.js";
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
  const readFileSync = vi.fn((path: string, ...args: any[]) => {
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

describe("McpServer.widget", () => {
  let server: McpServer;
  let mockResource: MockInstance<McpServer["resource"]>;
  let mockRegisterTool: MockInstance<McpServer["registerTool"]>;
  let readFileSyncSpy: any = null;

  beforeEach(() => {
    ({ server, mockResource, mockRegisterTool } = createMockMcpServer());
  });

  afterEach(() => {
    vi.clearAllMocks();
    resetTestEnv();
  });

  it("should generate correct HTML for development mode", async () => {
    setTestEnv({ NODE_ENV: "development" });

    const mockToolCallback = vi.fn();
    const mockResourceConfig = { description: "Test widget" };
    const mockToolConfig = { description: "Test tool" };

    server.widget(
      "my-widget",
      mockResourceConfig,
      mockToolConfig,
      mockToolCallback
    );

    // Get the resource callback function
    const resourceCallback = mockResource.mock.calls[0]?.[3] as (
      uri: URL,
      extra: any
    ) => any;
    expect(resourceCallback).toBeDefined();

    const serverUrl = "http://localhost:3000";
    const mockExtra = createMockExtra("__not_used__");
    const result = await resourceCallback(
      new URL("ui://widgets/my-widget.html"),
      mockExtra
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

    // Check development-specific content
    expect(result.contents[0]?.text).toContain(serverUrl + "/@react-refresh");
    expect(result.contents[0]?.text).toContain(serverUrl + "/@vite/client");
    expect(result.contents[0]?.text).toContain(
      serverUrl + "/src/widgets/my-widget.tsx"
    );
  });

  it("should generate correct HTML for production mode", async () => {
    setTestEnv({ NODE_ENV: "production" });

    const mockToolCallback = vi.fn();
    const mockResourceConfig = { description: "Test widget" };
    const mockToolConfig = { description: "Test tool" };

    server.widget(
      "my-widget",
      mockResourceConfig,
      mockToolConfig,
      mockToolCallback
    );

    // Get the resource callback function
    const resourceCallback = mockResource.mock.calls[0]?.[3] as (
      uri: URL,
      extra: any
    ) => any;
    expect(resourceCallback).toBeDefined();

    const serverUrl = "https://myapp.com";
    const mockExtra = createMockExtra(serverUrl);
    const result = await resourceCallback!(
      new URL("ui://widgets/my-widget.html"),
      mockExtra
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
      serverUrl + "@react-refresh"
    );
    expect(result.contents[0]?.text).not.toContain(serverUrl + "@vite/client");
    expect(result.contents[0]?.text).toContain(
      serverUrl + "/assets/my-widget.js"
    );
    expect(result.contents[0]?.text).toContain(serverUrl + "/assets/style.css");
  });
});
