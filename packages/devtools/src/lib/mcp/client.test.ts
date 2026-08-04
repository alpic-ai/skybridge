import { beforeEach, describe, expect, it, vi } from "vitest";
import { McpClient } from "./client.js";

const SERVER_URL = "http://localhost:3000/mcp";
const AUTH_SERVER_URL =
  "http://localhost:9000/.well-known/openid-configuration";

type TransportOptions = {
  fetch?: typeof fetch;
  requestInit?: RequestInit;
};

const mock = vi.hoisted(() => ({
  transportOptions: undefined as TransportOptions | undefined,
}));

vi.mock("@modelcontextprotocol/sdk/client/streamableHttp.js", () => ({
  StreamableHTTPClientTransport: class {
    constructor(_url: URL, options: TransportOptions) {
      mock.transportOptions = options;
    }
  },
}));

vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: class {
    connect = vi.fn().mockResolvedValue(undefined);
  },
}));

/**
 * Mirrors `createFetchWithInit` in the MCP SDK's shared/transport.js, which
 * applies `requestInit` to every request the transport makes — the behaviour
 * these tests exist to pin down. Tests therefore assert on what reaches the
 * network, not on which transport option the implementation happened to use.
 */
function effectiveFetch(options: TransportOptions): typeof fetch {
  const baseFetch = options.fetch ?? ((...args) => globalThis.fetch(...args));
  const baseInit = options.requestInit;
  if (!baseInit) {
    return baseFetch;
  }
  return (input, init) =>
    baseFetch(input, {
      ...baseInit,
      ...init,
      headers: init?.headers
        ? {
            ...Object.fromEntries(new Headers(baseInit.headers)),
            ...Object.fromEntries(new Headers(init.headers)),
          }
        : baseInit.headers,
    });
}

/** Connects, then returns the fetch the transport would actually use. */
async function connectAndCaptureFetch(serverUrl: string = SERVER_URL) {
  await new McpClient().connect(serverUrl);
  if (!mock.transportOptions) {
    throw new Error("transport was never constructed");
  }
  return effectiveFetch(mock.transportOptions);
}

describe("McpClient forwarded headers", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  /** Headers the underlying fetch was actually called with. */
  const sentHeaders = () => new Headers(fetchSpy.mock.calls[0]?.[1]?.headers);

  beforeEach(() => {
    mock.transportOptions = undefined;
    fetchSpy = vi.fn().mockResolvedValue(new Response(null));
    vi.stubGlobal("fetch", fetchSpy);
  });

  it("adds forwarded headers to requests to the MCP server", async () => {
    const wrapped = await connectAndCaptureFetch();

    await wrapped(new URL(SERVER_URL));

    expect(sentHeaders().get("x-forwarded-host")).toBe("localhost:3000");
    expect(sentHeaders().get("x-forwarded-proto")).toBe("http");
  });

  it("does not send forwarded headers to the authorization server", async () => {
    const wrapped = await connectAndCaptureFetch();

    // Discovery and DCR are cross-origin; forwarded headers here would trigger
    // a CORS preflight the authorization server has no reason to allow.
    await wrapped(new URL(AUTH_SERVER_URL));

    expect(sentHeaders().get("x-forwarded-host")).toBeNull();
    expect(sentHeaders().get("x-forwarded-proto")).toBeNull();
  });

  it("preserves the headers the transport already set", async () => {
    const wrapped = await connectAndCaptureFetch();

    await wrapped(new URL(SERVER_URL), {
      headers: new Headers({
        authorization: "Bearer token-123",
        "mcp-session-id": "session-abc",
        "content-type": "application/json",
      }),
    });

    expect(sentHeaders().get("authorization")).toBe("Bearer token-123");
    expect(sentHeaders().get("mcp-session-id")).toBe("session-abc");
    expect(sentHeaders().get("content-type")).toBe("application/json");
    expect(sentHeaders().get("x-forwarded-host")).toBe("localhost:3000");
  });

  it("accepts string and Request inputs", async () => {
    const wrapped = await connectAndCaptureFetch();

    await wrapped(SERVER_URL);
    expect(sentHeaders().get("x-forwarded-host")).toBe("localhost:3000");

    fetchSpy.mockClear();
    await wrapped(new Request(AUTH_SERVER_URL));
    expect(sentHeaders().get("x-forwarded-host")).toBeNull();
  });

  it("reports the scheme of an https server", async () => {
    const wrapped = await connectAndCaptureFetch("https://mcp.example.com/mcp");

    await wrapped(new URL("https://mcp.example.com/mcp"));

    expect(sentHeaders().get("x-forwarded-host")).toBe("mcp.example.com");
    expect(sentHeaders().get("x-forwarded-proto")).toBe("https");
  });

  it("leaves the rest of the request init intact", async () => {
    const wrapped = await connectAndCaptureFetch();
    const signal = AbortSignal.timeout(1000);

    await wrapped(new URL(SERVER_URL), {
      method: "POST",
      body: '{"jsonrpc":"2.0"}',
      signal,
    });

    expect(fetchSpy.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      body: '{"jsonrpc":"2.0"}',
      signal,
    });
  });

  it("replaces a forwarded header rather than appending to it", async () => {
    const wrapped = await connectAndCaptureFetch();

    await wrapped(new URL(SERVER_URL), {
      headers: { "x-forwarded-host": "stale.example.com" },
    });

    expect(sentHeaders().get("x-forwarded-host")).toBe("localhost:3000");
  });
});
