import http from "node:http";
import type { AddressInfo } from "node:net";
import type {
  Implementation,
  Server as SdkServer,
  ServerOptions,
} from "@modelcontextprotocol/server";
import type { ErrorRequestHandler, Express, RequestHandler } from "express";
import type { OAuthConfig } from "./auth/index.js";
import { type ResourceMetadataUrlResolver, setupOAuth } from "./auth/setup.js";
import type { ExtraClaims } from "./auth.js";
import { buildMcpHandler, createApp, createBaseApp } from "./express.js";
import { createMiddlewareEntry } from "./metric.js";
import type { McpMiddlewareEntry } from "./middleware.js";
import { buildMiddlewareChain, getHandlerMaps } from "./middleware.js";
import {
  McpServer,
  type McpServerTypes,
  type SkybridgeServerOptions,
  type ToolDef,
} from "./server.js";

const SLOW_FACTORY_THRESHOLD_MS = 50;

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
 * The bare {@link McpServer} a {@link SkybridgeHandler} receives: no tools
 * registered yet. Use it to annotate a handler extracted into its own
 * declaration — `(server: SkybridgeServer) => server.registerTool(…)` — and
 * pass the claims your OAuth verifier produces to type
 * `extra.http.authInfo.extra` in handlers. Leave the handler's return type
 * inferred: the returned chain is what carries the tool registry into
 * `typeof app`.
 */
export type SkybridgeServer<TAuthExtra extends ExtraClaims = ExtraClaims> =
  McpServer<Record<never, ToolDef>, TAuthExtra>;

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
 * Async alternative to passing a {@link SkybridgeFactory} directly: a zero-arg
 * function that loads whatever the factory needs (remote config, secrets, …)
 * and resolves to it. It runs once — at {@link Skybridge.run} or on the first
 * request, never at module import — so importing `server.ts` from tests and
 * evals stays free of side effects. The factory it returns is still
 * synchronous and still runs per request.
 */
export type SkybridgeFactoryLoader<
  TTools extends Record<string, ToolDef>,
  TAuthExtra extends ExtraClaims,
> = () => Promise<SkybridgeFactory<TTools, TAuthExtra>>;

/**
 * The `handler` field of {@link SkybridgeAppConfig}: builds the app's MCP
 * surface, with the config `setup` produced as its second argument. Same
 * contract as {@link SkybridgeFactory} otherwise — it runs again for every
 * incoming request, must stay synchronous, and must **return** the chained
 * server so `typeof app` carries the registered tool types.
 */
export type SkybridgeHandler<
  TTools extends Record<string, ToolDef>,
  TContext,
  TAuthExtra extends ExtraClaims,
> = (
  server: McpServer<Record<never, ToolDef>, TAuthExtra>,
  context: TContext,
) => McpServer<TTools, TAuthExtra>;

/**
 * What the `oauth` field accepts: a resolved {@link OAuthConfig}, a promise of
 * one (the branded providers are async), or a function of the `setup` result.
 * A function or promise is resolved once — at {@link Skybridge.run} or on the
 * first request, never at module import — so prefer a function when building
 * the config has side effects (network discovery, secrets).
 */
export type SkybridgeOAuthInput<TContext, TExtra extends ExtraClaims> =
  | OAuthConfig<TExtra>
  | Promise<OAuthConfig<TExtra>>
  | ((context: TContext) => OAuthConfig<TExtra> | Promise<OAuthConfig<TExtra>>);

/**
 * The all-in-one configuration for {@link Skybridge}: everything in
 * {@link SkybridgeConfig} plus the app's behavior.
 *
 * - `setup` loads whatever the app needs up front (remote config, secrets,
 *   datasets, …). It runs **once** — at {@link Skybridge.run} or on the first
 *   request, never at module import — and its awaited return value is passed
 *   to an `oauth` function and to `handler` as the second argument.
 * - `oauth` configures resource-server OAuth: it mounts the well-known
 *   metadata routes and bearer auth on `/mcp`, and its verifier's claims type
 *   `extra.http.authInfo.extra` in tool handlers.
 * - `handler` registers the MCP surface and runs for **every incoming
 *   request** on a fresh {@link McpServer}, so keep it to registration and
 *   **return** the chained server — its return type is what carries the tool
 *   registry into `typeof app`.
 */
export type SkybridgeAppConfig<
  TTools extends Record<string, ToolDef>,
  TContext,
  TAuthExtra extends ExtraClaims,
> = Omit<SkybridgeConfig<TAuthExtra>, "oauth"> & {
  setup?: () => TContext;
  oauth?: SkybridgeOAuthInput<Awaited<TContext>, TAuthExtra>;
  handler: SkybridgeHandler<TTools, Awaited<TContext>, TAuthExtra>;
};

/**
 * A Skybridge app: the HTTP surface (Express, OAuth metadata, the `/mcp`
 * route) plus a handler that builds the MCP server for each request.
 *
 * The handler runs for every request, so tools, resources, prompts and views
 * are always registered on the instance that serves the request. Anything in
 * the handler body other than registration therefore runs per request too.
 * Anything asynchronous the app needs (remote config, secrets, …) goes in
 * `setup`, which runs once and feeds the handler's second argument.
 *
 * All type parameters are inferred from the config: the context from `setup`,
 * the auth claims from `oauth`, and the tool registry from the server the
 * handler returns. You almost never set them manually.
 *
 * @example
 * ```ts
 * export const app = new Skybridge({
 *   name: "my-app",
 *   version: "1.0.0",
 *   setup: async () => loadConfig(),
 *   oauth: (config) => descopeProvider({ url: config.mcpServerUrl }),
 *   handler: (server, config) =>
 *     server.registerTool(
 *       {
 *         name: "search",
 *         inputSchema: { query: z.string() },
 *         view: { component: "search" },
 *       },
 *       async ({ query }) => ({ content: `Results for ${query}` }),
 *     ),
 * });
 *
 * export type AppType = typeof app;
 * ```
 *
 * @see https://docs.skybridge.tech/api-reference/mcp-server
 */
export class Skybridge<
  TTools extends Record<string, ToolDef> = Record<never, ToolDef>,
  TContext = undefined,
  TAuthExtra extends ExtraClaims = ExtraClaims,
> {
  declare readonly $types: McpServerTypes<TTools>;
  private readonly serverInfo: Implementation;
  private readonly serverOptions: ServerOptions;
  private readonly skybridgeOptions: SkybridgeServerOptions<TAuthExtra>;
  private factory?: SkybridgeFactory<TTools, TAuthExtra>;
  private readonly factoryLoader?: SkybridgeFactoryLoader<TTools, TAuthExtra>;
  private readonly contextLoader?: () => TContext;
  private context?: Awaited<TContext>;
  private readonly oauthInput?:
    | OAuthConfig<TAuthExtra>
    | Promise<OAuthConfig<TAuthExtra>>
    | ((
        context: unknown,
      ) => OAuthConfig<TAuthExtra> | Promise<OAuthConfig<TAuthExtra>>);
  private readonly expressApp: Express;
  private readonly errorMiddleware: ErrorMiddlewareConfig[] = [];
  private readonly monitoringEntry: McpMiddlewareEntry | null =
    createMiddlewareEntry();
  private resolveResourceMetadataUrl?: ResourceMetadataUrlResolver;
  private ready?: Promise<void>;
  private slowFactoryWarned = false;

  constructor(config: SkybridgeAppConfig<TTools, TContext, TAuthExtra>);
  /**
   * Construct with a {@link SkybridgeFactory} — or a
   * {@link SkybridgeFactoryLoader} when the factory needs async setup —
   * passed separately from the config.
   */
  constructor(
    config: SkybridgeConfig<TAuthExtra>,
    factory:
      | SkybridgeFactory<TTools, TAuthExtra>
      | SkybridgeFactoryLoader<TTools, TAuthExtra>,
  );
  constructor(
    config:
      | SkybridgeAppConfig<TTools, TContext, TAuthExtra>
      | SkybridgeConfig<TAuthExtra>,
    factory?:
      | SkybridgeFactory<TTools, TAuthExtra>
      | SkybridgeFactoryLoader<TTools, TAuthExtra>,
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
      setup,
      handler,
      ...serverOptions
    } = config as SkybridgeAppConfig<TTools, TContext, TAuthExtra>;

    this.serverInfo = { name, title, version, description, icons, websiteUrl };
    this.serverOptions = serverOptions;
    this.skybridgeOptions = { json, skills };
    this.oauthInput = oauth as typeof this.oauthInput;
    this.expressApp = createBaseApp(json);

    if (factory) {
      if (factory.length === 0) {
        this.factoryLoader = factory as SkybridgeFactoryLoader<
          TTools,
          TAuthExtra
        >;
        return;
      }
      this.factory = factory as SkybridgeFactory<TTools, TAuthExtra>;
    } else if (handler) {
      this.factory = (server) =>
        handler(server, this.context as Awaited<TContext>);
      this.contextLoader = setup;
    }

    const oauthNeedsResolution =
      typeof oauth === "function" ||
      typeof (oauth as { then?: unknown } | undefined)?.then === "function";
    if (!this.factory || this.contextLoader || oauthNeedsResolution) {
      return;
    }

    const resolvedOauth = oauth as OAuthConfig<TAuthExtra> | undefined;
    this.skybridgeOptions.oauth = resolvedOauth;
    const sample = this.buildServer();
    if (resolvedOauth) {
      this.resolveResourceMetadataUrl = setupOAuth(
        this.expressApp,
        resolvedOauth,
        sample.securitySchemesByTool,
      );
    }
    this.ready = Promise.resolve();
  }

  /**
   * Resolve the factory loader, the `setup` context, and the `oauth` input,
   * then wire OAuth onto the Express app. Runs once; every entry point that
   * needs a built server awaits it. Immediate no-op when everything was
   * resolvable synchronously at construction.
   */
  private ensureReady(): Promise<void> {
    this.ready ??= (async () => {
      if (this.factoryLoader) {
        this.factory = await this.factoryLoader();
      }
      if (this.contextLoader) {
        this.context = await this.contextLoader();
      }
      const source = this.oauthInput;
      const resolvedOauth =
        typeof source === "function"
          ? await source(this.context)
          : await source;
      this.skybridgeOptions.oauth = resolvedOauth;
      const sample = this.buildServer();
      if (resolvedOauth) {
        this.resolveResourceMetadataUrl = setupOAuth(
          this.expressApp,
          resolvedOauth,
          sample.securitySchemesByTool,
        );
      }
    })().catch((error) => {
      this.ready = undefined;
      throw error;
    });
    return this.ready;
  }

  /**
   * The underlying Express app. Use this to extend the HTTP server with
   * custom routes, middleware, or settings — e.g.
   * `app.express.get("/health", ...)`.
   *
   * `express.json()` is pre-applied — tune it via the `json` config field,
   * e.g. `new Skybridge({ name, version, json: { limit: "10mb" }, handler })`.
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
   * Build a fresh server for one stateless HTTP request, as
   * `createMcpHandler`'s factory contract requires: the handler runs again so
   * the SDK's handler closures belong to the instance whose protocol era it
   * stamps. Sharing one instance's handler maps instead would bind them to an
   * instance that is never marked, pinning every request to the 2025 codec and
   * letting concurrent callers overwrite each other's negotiated version.
   *
   * Awaits the `setup` context, the async factory loader, and the `oauth`
   * input on first use.
   */
  async createServerInstance(): Promise<SdkServer> {
    await this.ensureReady();
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
    const instance = await this.createServerInstance();
    await instance.connect(transport);
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
    await this.ensureReady();

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
    const mcpHandler = buildMcpHandler(this);

    await createApp({
      app: this,
      httpServer,
      mcpHandler,
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
      mcpHandler.close().catch(() => {});
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
    if (!this.factory) {
      throw new Error(
        "No handler registered on this Skybridge app: pass `handler` in the config (or a factory as the second constructor argument), then await run(), connect(), or createServerInstance().",
      );
    }
    const server = new McpServer<Record<never, ToolDef>, TAuthExtra>(
      this.serverInfo,
      this.serverOptions,
      this.skybridgeOptions,
    );
    if (this.resolveResourceMetadataUrl) {
      server.setResourceMetadataUrlResolver(this.resolveResourceMetadataUrl);
    }
    const startedAt = performance.now();
    const built = this.factory(server);
    const elapsed = performance.now() - startedAt;
    if (typeof (built as { then?: unknown }).then === "function") {
      throw new Error(
        "The Skybridge handler must be synchronous — it runs on every request. Load config or secrets in `setup` instead and read them from the handler's second argument.",
      );
    }
    if (elapsed > SLOW_FACTORY_THRESHOLD_MS && !this.slowFactoryWarned) {
      this.slowFactoryWarned = true;
      console.warn(
        `The Skybridge handler took ${Math.round(elapsed)}ms — it runs on every request, so this cost is paid per request. Hoist expensive work to module scope or into \`setup\`, whose result is passed to the handler.`,
      );
    }
    return built;
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
