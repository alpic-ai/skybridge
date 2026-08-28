import http from "node:http";
import type { AddressInfo } from "node:net";
import {
  createMcpHandler,
  type Implementation,
  type McpHttpHandler,
  type Server as SdkServer,
  type ServerOptions,
  UnsupportedProtocolVersionError,
} from "@modelcontextprotocol/server";
import type { ErrorRequestHandler, Express, RequestHandler } from "express";
import { type ResourceMetadataUrlResolver, setupOAuth } from "./auth/setup.js";
import type { ExtraClaims } from "./auth.js";
import { createApp, createBaseApp } from "./express.js";
import { createMiddlewareEntry } from "./metric.js";
import type { McpMiddlewareEntry } from "./middleware.js";
import { buildMiddlewareChain, getHandlerMaps } from "./middleware.js";
import {
  McpServer,
  type McpServerTypes,
  type SkybridgeServerOptions,
  type ToolDef,
} from "./server.js";

type ErrorMiddlewareConfig = {
  path?: string;
  handlers: ErrorRequestHandler[];
};

/**
 * Everything a Skybridge app needs in one bag: the MCP implementation info
 * (`name`, `version`, …), the SDK's {@link ServerOptions} (`capabilities`,
 * `instructions`, …), and the Skybridge-specific options (`oauth`, `json`,
 * `skills`).
 */
export type SkybridgeConfig<TAuthExtra extends ExtraClaims = ExtraClaims> =
  Implementation & ServerOptions & SkybridgeServerOptions<TAuthExtra>;

/**
 * Builds an app's MCP surface. Runs again for **every incoming request**, on a
 * fresh {@link McpServer}, so keep it to registration: hoist pools, timers,
 * clients and any other side effect to module scope and close over them.
 *
 * It must **return** the chained server so `typeof app` carries the registered
 * tool types.
 */
export type SkybridgeFactory<
  TTools extends Record<string, ToolDef>,
  TAuthExtra extends ExtraClaims,
> = (
  server: McpServer<Record<never, ToolDef>, TAuthExtra>,
) => McpServer<TTools, TAuthExtra>;

/**
 * A Skybridge app: the HTTP surface (Express, OAuth metadata, the `/mcp`
 * route) plus a factory that builds the MCP server for each request.
 *
 * The factory runs for every request, so tools, resources, prompts and views
 * are always registered on the instance that serves the request. Anything in
 * the factory body other than registration therefore runs per request too.
 * It also runs once at construction, which surfaces registration errors at
 * boot and gives the OAuth layer the set of per-tool security schemes.
 *
 * @typeParam TTools - Accumulated tool registry, inferred from the server the
 * factory returns. You almost never set this manually.
 *
 * @example
 * ```ts
 * export const app = new Skybridge(
 *   { name: "my-app", version: "1.0.0", capabilities: {} },
 *   (server) =>
 *     server.registerTool(
 *       {
 *         name: "search",
 *         inputSchema: { query: z.string() },
 *         view: { component: "search" },
 *       },
 *       async ({ query }) => ({ content: `Results for ${query}` }),
 *     ),
 * );
 *
 * export type AppType = typeof app;
 * ```
 *
 * @see https://docs.skybridge.tech/api-reference/mcp-server
 */
export class Skybridge<
  TTools extends Record<string, ToolDef> = Record<never, ToolDef>,
  TAuthExtra extends ExtraClaims = ExtraClaims,
> {
  declare readonly $types: McpServerTypes<TTools>;
  private readonly serverInfo: Implementation;
  private readonly serverOptions: ServerOptions;
  private readonly skybridgeOptions: SkybridgeServerOptions<TAuthExtra>;
  private readonly factory: SkybridgeFactory<TTools, TAuthExtra>;
  private readonly expressApp: Express;
  private readonly errorMiddleware: ErrorMiddlewareConfig[] = [];
  private readonly monitoringEntry: McpMiddlewareEntry | null =
    createMiddlewareEntry();
  private resolveResourceMetadataUrl?: ResourceMetadataUrlResolver;
  private cachedFetchHandler?: McpHttpHandler;

  constructor(
    config: SkybridgeConfig<TAuthExtra>,
    factory: SkybridgeFactory<TTools, TAuthExtra>,
  ) {
    const {
      name,
      title,
      version,
      description,
      icons,
      websiteUrl,
      json,
      oauth,
      skills,
      ...serverOptions
    } = config;

    this.serverInfo = { name, title, version, description, icons, websiteUrl };
    this.serverOptions = serverOptions;
    this.skybridgeOptions = { json, oauth, skills };
    this.factory = factory;

    const sample = this.buildServer();

    this.expressApp = createBaseApp(json);
    if (oauth) {
      this.resolveResourceMetadataUrl = setupOAuth(
        this.expressApp,
        oauth,
        sample.securitySchemesByTool,
      );
    }
  }

  /**
   * The underlying Express app. Use this to extend the HTTP server with
   * custom routes, middleware, or settings — e.g.
   * `app.express.get("/health", ...)`.
   *
   * `express.json()` is pre-applied — tune it via the `json` config field,
   * e.g. `new Skybridge({ name, version, json: { limit: "10mb" } }, setup)`.
   * Register your handlers before `run()`; after `run()`, dev-mode middleware,
   * the `/mcp` route, and the default error handler are appended in that order.
   *
   * Note: Alpic Cloud only routes traffic to `/mcp` — custom routes work
   * locally and on self-hosted deployments.
   */
  get express(): Express {
    return this.expressApp;
  }

  /**
   * The app's fetch handler for `/mcp`: a `Request` → `Response` function that
   * builds a fresh MCP server per request. Memoized, so the same handler is
   * reused across requests.
   */
  get fetchHandler(): McpHttpHandler {
    this.cachedFetchHandler ??= createMcpHandler(
      () => this.createServerInstance(),
      {
        onerror: (error) => {
          if (error instanceof UnsupportedProtocolVersionError) {
            return;
          }
          console.error("Error handling MCP request:", error);
        },
      },
    );
    return this.cachedFetchHandler;
  }

  /**
   * Build a fresh server for one stateless HTTP request, as
   * `createMcpHandler`'s factory contract requires: the factory runs again so
   * the SDK's handler closures belong to the instance whose protocol era it
   * stamps. Sharing one instance's handler maps instead would bind them to an
   * instance that is never marked, pinning every request to the 2025 codec and
   * letting concurrent callers overwrite each other's negotiated version.
   */
  createServerInstance(): SdkServer {
    const server = this.buildServer();
    this.instrumentHandlers(server);
    return server.server;
  }

  /**
   * Connect a Skybridge app to an MCP transport. Use this when you're
   * embedding Skybridge in a host that already manages its own transport
   * (e.g. stdio for desktop apps); for HTTP, prefer {@link Skybridge.run}
   * which sets the transport up for you.
   */
  async connect(transport: Parameters<SdkServer["connect"]>[0]): Promise<void> {
    await this.createServerInstance().connect(transport);
  }

  /**
   * Register Express middleware on the underlying app. Mirrors `app.use` —
   * pass handlers directly or a path-prefixed handler list. Register before
   * {@link Skybridge.run}; ordering matches Express.
   *
   * Note: Alpic Cloud only routes traffic to `/mcp`. Custom paths work
   * locally and on self-hosted deployments.
   */
  use(...handlers: RequestHandler[]): this;
  use(path: string, ...handlers: RequestHandler[]): this;
  use(
    pathOrHandler: string | RequestHandler,
    ...handlers: RequestHandler[]
  ): this {
    // Branching is load-bearing: Express's `app.use` overloads can't be
    // resolved against a `string | RequestHandler` union, so we narrow.
    if (typeof pathOrHandler === "string") {
      this.expressApp.use(pathOrHandler, ...handlers);
    } else {
      this.expressApp.use(pathOrHandler, ...handlers);
    }
    return this;
  }

  /**
   * Register Express error-handling middleware to run after the built-in
   * `/mcp` route (or your custom route). Use this to log or transform errors
   * thrown by tool handlers before the default error handler responds.
   *
   * @example
   * ```ts
   * app.useOnError((err, _req, _res, next) => {
   *   logger.error(err);
   *   next(err);
   * });
   * ```
   */
  useOnError(...handlers: ErrorRequestHandler[]): this;
  useOnError(path: string, ...handlers: ErrorRequestHandler[]): this;
  useOnError(
    pathOrHandler: string | ErrorRequestHandler,
    ...handlers: ErrorRequestHandler[]
  ): this {
    if (typeof pathOrHandler === "string") {
      this.errorMiddleware.push({ path: pathOrHandler, handlers });
    } else {
      this.errorMiddleware.push({ handlers: [pathOrHandler, ...handlers] });
    }
    return this;
  }

  /**
   * Start the HTTP server. Listens on `process.env.__PORT` (default `3000`),
   * mounts the `/mcp` route, and applies any custom Express middleware
   * registered via {@link Skybridge.use} / {@link Skybridge.useOnError}.
   *
   * On Cloudflare Workers / workerd, returns an object exposing `fetch` so
   * the runtime can bridge incoming requests to the Node HTTP server. On
   * Vercel (`VERCEL === "1"`), returns the Express app directly so the
   * serverless function entry can call it as a `(req, res)` handler. On
   * Node, returns `undefined` once listening. When the process was spawned
   * with an IPC channel, the bound port is reported to the parent as
   * `{ type: "skybridge:listening", port }`, the readiness signal test runners
   * wait on instead of polling.
   */
  async run(): Promise<
    { fetch: (...args: unknown[]) => unknown } | Express | undefined
  > {
    if (process.env.VERCEL === "1") {
      // createApp only reads httpServer inside its dev-only branch
      // (viewsDevServer); under VERCEL=1 + NODE_ENV=production it's a
      // bare object passed to satisfy the required parameter.
      const httpServer = http.createServer();
      await createApp({
        app: this,
        httpServer,
        errorMiddleware: this.errorMiddleware,
      });
      return this.expressApp;
    }

    const httpServer = http.createServer();

    await createApp({
      app: this,
      httpServer,
      errorMiddleware: this.errorMiddleware,
    });

    httpServer.on("request", this.expressApp);
    const intendedPort = parseInt(process.env.__PORT ?? "3000", 10);
    await new Promise<void>((resolve, reject) => {
      httpServer.on("error", (error: Error) => {
        console.error("Failed to start server:", error);
        reject(error);
      });
      httpServer.listen(intendedPort, () => {
        resolve();
      });
    });

    const { port } = httpServer.address() as AddressInfo;
    process.send?.({ type: "skybridge:listening", port });

    // On workerd, bridge the Node http server to a Workers fetch handler.
    // The specifier is held in a variable to sidestep tsc's module resolution
    // (`cloudflare:node` only exists under wrangler/workerd).
    if (
      typeof navigator !== "undefined" &&
      navigator.userAgent === "Cloudflare-Workers"
    ) {
      const cloudflareNode = "cloudflare:node";
      const { httpServerHandler } = await import(cloudflareNode);
      return httpServerHandler({ port });
    }

    const shutdown = () => {
      // Drop both handlers so a second signal falls through to Node's default
      // (force-quit on a second Ctrl+C while drain is hanging).
      process.off("SIGTERM", shutdown);
      process.off("SIGINT", shutdown);
      this.cachedFetchHandler?.close().catch(() => {});
      httpServer.close(() => process.exit(0));
      // Force exit if connections don't drain in time so the port is still
      // released promptly (e.g. for nodemon restarts).
      setTimeout(() => process.exit(0), 3000).unref();
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
    return undefined;
  }

  private buildServer(): McpServer<TTools, TAuthExtra> {
    const server = new McpServer<Record<never, ToolDef>, TAuthExtra>(
      this.serverInfo,
      this.serverOptions,
      this.skybridgeOptions,
    );
    if (this.resolveResourceMetadataUrl) {
      server.setResourceMetadataUrlResolver(this.resolveResourceMetadataUrl);
    }
    return this.factory(server);
  }

  private middlewareEntries(
    server: McpServer<Record<never, ToolDef>, TAuthExtra>,
  ): McpMiddlewareEntry[] {
    return [
      ...(this.monitoringEntry ? [this.monitoringEntry] : []),
      ...server.protocolMiddlewareEntries(),
    ];
  }

  private instrumentHandlers(
    server: McpServer<Record<never, ToolDef>, TAuthExtra>,
  ): void {
    const entries = this.middlewareEntries(server);
    const { requestHandlers, notificationHandlers } = getHandlerMaps(
      server.server,
    );

    const instrumentMap = (
      map: Map<string, (...args: unknown[]) => Promise<unknown>>,
      isNotification: boolean,
    ) => {
      for (const [method, handler] of map) {
        map.set(
          method,
          buildMiddlewareChain(method, isNotification, handler, entries),
        );
      }
      const originalSet = map.set.bind(map);
      map.set = (
        method: string,
        handler: (...args: unknown[]) => Promise<unknown>,
      ) =>
        originalSet(
          method,
          buildMiddlewareChain(method, isNotification, handler, entries),
        );
    };

    instrumentMap(requestHandlers, false);
    instrumentMap(notificationHandlers, true);
  }
}
