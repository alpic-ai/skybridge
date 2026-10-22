import http from "node:http";
import type { AddressInfo } from "node:net";
import type {
  Implementation,
  McpHttpHandler,
  Server as SdkServer,
  ServerOptions,
} from "@modelcontextprotocol/server";
import type { ErrorRequestHandler, Express, RequestHandler } from "express";
import type { OAuthConfig, OAuthProvider } from "./auth/index.js";
import { type ResourceMetadataUrlResolver, setupOAuth } from "./auth/setup.js";
import type { ExtraClaims } from "./auth.js";
import {
  defineServer,
  type ServerDefinition,
  type ServerExecution,
  type ServerHandler,
} from "./definition.js";
import { buildMcpHandler, createApp, createBaseApp } from "./express.js";
import type { JsonOptions, McpServerTypes, ToolDef } from "./server.js";

type ErrorMiddlewareConfig = {
  path?: string;
  handlers: ErrorRequestHandler[];
};

/**
 * The `handler` field of {@link SkybridgeConfig}: builds the app's MCP
 * surface. Runs again for **every incoming request**, on a fresh
 * {@link McpServer}, so keep it to registration: pools, clients and any other
 * one-time work belong in `setup`, whose result is the second argument. It
 * must **return** the chained server so `typeof app` carries the registered
 * tool types.
 *
 * @typeParam TConfig - What `setup` resolved to, passed as the second argument.
 */
export type SkybridgeHandler<
  TTools extends Record<string, ToolDef>,
  TConfig,
  TAuthExtra extends ExtraClaims,
> = ServerHandler<TTools, TConfig, TAuthExtra>;

/**
 * What the `oauth` field accepts: an {@link OAuthConfig}, a provider
 * (`oauth: auth0Provider(...)`), or a function of the `setup` result returning
 * either. Providers and functions resolve once, at {@link Skybridge.run} or on
 * the first request, never at module import. Anything asynchronous belongs in
 * a provider's `resolve`.
 */
export type SkybridgeOAuthInput<TConfig, TExtra extends ExtraClaims> =
  | OAuthConfig<TExtra>
  | OAuthProvider<TExtra>
  | ((config: TConfig) => OAuthConfig<TExtra> | OAuthProvider<TExtra>);

async function resolveOAuthInput<TConfig, TExtra extends ExtraClaims>(
  input: SkybridgeOAuthInput<TConfig, TExtra> | undefined,
  config: TConfig,
): Promise<OAuthConfig<TExtra> | undefined> {
  const resolved = typeof input === "function" ? input(config) : input;
  return resolved && "resolve" in resolved
    ? await resolved.resolve()
    : resolved;
}

/**
 * Everything a Skybridge app needs in one bag: the MCP implementation info
 * (`name`, `version`, …), the SDK's {@link ServerOptions} (`capabilities`,
 * `instructions`, …), the Express and skills options, and the app's behavior
 * (`setup`, `oauth`, `handler`).
 *
 * All type parameters are inferred from the value: the config from `setup`,
 * the auth claims from `oauth`, and the tool registry from the server
 * `handler` returns.
 */
export type SkybridgeConfig<
  TTools extends Record<string, ToolDef> = Record<never, ToolDef>,
  TConfig = undefined,
  TAuthExtra extends ExtraClaims = ExtraClaims,
> =
  | {
      server: ServerDefinition<TTools, TConfig, TAuthExtra>;
      json?: JsonOptions;
      oauth?: SkybridgeOAuthInput<Awaited<TConfig>, TAuthExtra>;
    }
  | (Implementation &
      ServerOptions & {
        /** Options for the built-in `express.json()` middleware, e.g. `{ limit: "10mb" }`. */
        json?: JsonOptions;
        /**
         * @experimental Serve Agent Skills from `src/skills` over MCP (SEP-2640).
         * API may change.
         */
        skills?: boolean;
        /**
         * Loads whatever the app needs up front (remote config, secrets, datasets,
         * …). Runs **once** — at {@link Skybridge.run} or on the first request,
         * never at module import — and its awaited return value is passed to an
         * `oauth` function and to `handler` as the second argument.
         */
        setup?: () => TConfig;
        dispose?: (config: Awaited<TConfig>) => void | Promise<void>;
        /**
         * Resource-server OAuth. When set, mounts the well-known metadata routes
         * and bearer auth on `/mcp`, and the verifier's claims type
         * `extra.http.authInfo.extra` in tool handlers.
         */
        oauth?: SkybridgeOAuthInput<Awaited<TConfig>, TAuthExtra>;
        /** Registers the MCP surface, per request. See {@link SkybridgeHandler}. */
        handler: SkybridgeHandler<TTools, Awaited<TConfig>, TAuthExtra>;
      });

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
  TConfig = undefined,
  TAuthExtra extends ExtraClaims = ExtraClaims,
> {
  declare readonly $types: McpServerTypes<TTools>;
  readonly server: ServerDefinition<TTools, TConfig, TAuthExtra>;
  private execution?: ServerExecution<TTools, TConfig, TAuthExtra>;
  private readonly oauthInput?: SkybridgeOAuthInput<
    Awaited<TConfig>,
    TAuthExtra
  >;
  private readonly expressApp: Express;
  private readonly errorMiddleware: ErrorMiddlewareConfig[] = [];
  private resolveResourceMetadataUrl?: ResourceMetadataUrlResolver;
  private readyPromise?: Promise<void>;
  private closed = false;
  private closePromise?: Promise<void>;
  private httpServer?: http.Server;
  private mcpHandler?: McpHttpHandler;

  constructor(config: SkybridgeConfig<TTools, TConfig, TAuthExtra>) {
    const { json, oauth, ...definition } = config;
    this.server =
      "server" in config
        ? config.server
        : defineServer(
            definition as Exclude<typeof config, { server: unknown }>,
          );
    this.oauthInput = oauth;
    this.expressApp = createBaseApp(json);
  }

  /**
   * Resolve `setup` and `oauth`, then wire OAuth onto the Express app. Runs
   * once; every entry point that needs a built server awaits it, and a failed
   * attempt is retried on the next call.
   *
   * @internal
   */
  ready(): Promise<void> {
    if (this.closed) {
      return Promise.reject(new Error("The Skybridge host is closed"));
    }
    this.readyPromise ??= (async () => {
      const execution = this.server.createExecution({
        oauth: Boolean(this.oauthInput),
        resourceMetadataUrl: this.oauthInput
          ? (header) => {
              if (!this.resolveResourceMetadataUrl) {
                throw new Error("OAuth is not initialized");
              }
              return this.resolveResourceMetadataUrl(header);
            }
          : undefined,
      });
      this.execution = execution;
      const config = await execution.ready();
      const oauth = await resolveOAuthInput(this.oauthInput, config);
      const sample = await execution.createServerInstance();
      try {
        if (oauth) {
          this.resolveResourceMetadataUrl = setupOAuth(
            this.expressApp,
            oauth,
            execution.securitySchemesByTool,
          );
        }
      } finally {
        await sample.close();
      }
    })().catch(async (error) => {
      try {
        await this.execution?.close();
      } finally {
        this.execution = undefined;
        this.readyPromise = undefined;
      }
      throw error;
    });
    return this.readyPromise;
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
   * Awaits `setup` and the `oauth` input on first use.
   */
  async createServerInstance(): Promise<SdkServer> {
    await this.ready();
    if (!this.execution) {
      throw new Error("The Skybridge host is not initialized");
    }
    return this.execution.createServerInstance();
  }

  /**
   * Connect a Skybridge app to an MCP transport. Use this when you're
   * embedding Skybridge in a host that already manages its own transport
   * (e.g. stdio for desktop apps); for HTTP, prefer {@link Skybridge.run}
   * which sets the transport up for you.
   */
  async connect(transport: Parameters<SdkServer["connect"]>[0]): Promise<void> {
    const instance = await this.createServerInstance();
    try {
      await instance.connect(transport);
    } catch (error) {
      await instance.close();
      throw error;
    }
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
    try {
      return await this.runHttp();
    } catch (error) {
      await this.close();
      throw error;
    }
  }

  private async runHttp(): Promise<
    { fetch: (...args: unknown[]) => unknown } | Express | undefined
  > {
    this.mcpHandler = buildMcpHandler(this);
    if (process.env.VERCEL === "1") {
      // createApp only reads httpServer inside its dev-only branch
      // (viewsDevServer); under VERCEL=1 + NODE_ENV=production it's a
      // bare object passed to satisfy the required parameter.
      const httpServer = http.createServer();
      this.httpServer = httpServer;
      await createApp({
        app: this,
        httpServer,
        mcpHandler: this.mcpHandler,
        errorMiddleware: this.errorMiddleware,
      });
      return this.expressApp;
    }

    const httpServer = http.createServer();
    this.httpServer = httpServer;
    const mcpHandler = this.mcpHandler;

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
      this.close().finally(() => process.exit(0));
      // Force exit if connections don't drain in time so the port is still
      // released promptly (e.g. for nodemon restarts).
      setTimeout(() => process.exit(0), 3000).unref();
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
    return undefined;
  }

  close() {
    this.closePromise ??= this.closeHttp();
    return this.closePromise;
  }

  private async closeHttp() {
    this.closed = true;
    await this.readyPromise?.catch(() => {});
    try {
      await Promise.all([
        this.mcpHandler?.close(),
        this.httpServer?.listening
          ? new Promise<void>((resolve, reject) =>
              this.httpServer?.close((error) =>
                error ? reject(error) : resolve(),
              ),
            )
          : undefined,
      ]);
    } finally {
      await this.execution?.close();
    }
  }
}
