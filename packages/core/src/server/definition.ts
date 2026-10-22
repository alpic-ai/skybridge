import type {
  CallToolResult,
  Implementation,
  Server,
  ServerOptions,
} from "@modelcontextprotocol/server";
import { VERSION } from "../version.js";
import type { ResourceMetadataUrlResolver } from "./auth/setup.js";
import type { ExtraClaims } from "./auth.js";
import { createMiddlewareEntry } from "./metric.js";
import {
  instrumentHandlers,
  type McpExtra,
  type McpMethodString,
  type McpMiddlewareEntry,
  type McpMiddlewareFilter,
  type McpMiddlewareFn,
  type McpTypedMiddlewareFn,
} from "./middleware.js";
import {
  McpServer,
  type McpServerTypes,
  type SecurityScheme,
  type ToolDef,
} from "./server.js";

export type ServerHandler<
  TTools extends Record<string, ToolDef>,
  TConfig,
  TAuthExtra extends ExtraClaims = ExtraClaims,
> = (
  server: McpServer<Record<never, ToolDef>, TAuthExtra>,
  config: TConfig,
) => McpServer<TTools, TAuthExtra>;

export type ServerDefinitionConfig<
  TTools extends Record<string, ToolDef>,
  TConfig,
  TAuthExtra extends ExtraClaims = ExtraClaims,
> = Partial<Implementation> &
  ServerOptions & {
    setup?: () => TConfig;
    dispose?: (config: Awaited<TConfig>) => void | Promise<void>;
    handler: ServerHandler<TTools, Awaited<TConfig>, TAuthExtra>;
    skills?: boolean;
  };

export type ToolImplementations<
  TTools extends Record<string, ToolDef>,
  TAuthExtra extends ExtraClaims = ExtraClaims,
> = {
  [Name in keyof TTools]?: (
    args: TTools[Name]["input"],
    extra: McpExtra<TAuthExtra>,
  ) => CallToolResult | undefined | Promise<CallToolResult | undefined>;
};

export interface ServerExecutionOptions<
  TTools extends Record<string, ToolDef>,
  TAuthExtra extends ExtraClaims = ExtraClaims,
> {
  oauth?: boolean;
  resourceMetadataUrl?: ResourceMetadataUrlResolver;
  toolImplementations?: ToolImplementations<TTools, TAuthExtra>;
}

export class ServerDefinition<
  TTools extends Record<string, ToolDef> = Record<never, ToolDef>,
  TConfig = undefined,
  TAuthExtra extends ExtraClaims = ExtraClaims,
> {
  declare readonly $types: McpServerTypes<TTools>;

  constructor(
    private readonly config: ServerDefinitionConfig<
      TTools,
      TConfig,
      TAuthExtra
    >,
    private readonly middleware: readonly McpMiddlewareEntry[] = [],
  ) {}

  mcpMiddleware(
    handler: McpMiddlewareFn<TAuthExtra>,
  ): ServerDefinition<TTools, TConfig, TAuthExtra>;
  mcpMiddleware<M extends McpMethodString>(
    filter: M,
    handler: McpTypedMiddlewareFn<M, TAuthExtra>,
  ): ServerDefinition<TTools, TConfig, TAuthExtra>;
  mcpMiddleware(
    filter: McpMiddlewareFilter,
    handler: McpMiddlewareFn<TAuthExtra>,
  ): ServerDefinition<TTools, TConfig, TAuthExtra>;
  mcpMiddleware(
    filterOrHandler: McpMiddlewareFilter | McpMiddlewareFn<TAuthExtra>,
    maybeHandler?: unknown,
  ) {
    const handler =
      typeof filterOrHandler === "function" ? filterOrHandler : maybeHandler;
    if (typeof handler !== "function") {
      throw new Error(
        "mcpMiddleware requires a handler function when a filter is provided",
      );
    }
    return new ServerDefinition(this.config, [
      {
        filter: typeof filterOrHandler === "function" ? null : filterOrHandler,
        handler: handler as McpMiddlewareFn,
      },
      ...this.middleware,
    ]);
  }

  createExecution(options: ServerExecutionOptions<TTools, TAuthExtra> = {}) {
    return new ServerExecution(this.config, this.middleware, options);
  }
}

export function defineServer<
  TTools extends Record<string, ToolDef>,
  TConfig = undefined,
  TAuthExtra extends ExtraClaims = ExtraClaims,
>(config: ServerDefinitionConfig<TTools, TConfig, TAuthExtra>) {
  return new ServerDefinition({ ...config });
}

export class ServerExecution<
  TTools extends Record<string, ToolDef>,
  TConfig,
  TAuthExtra extends ExtraClaims = ExtraClaims,
> {
  private dependencies?: Awaited<TConfig>;
  private initialized = false;
  private readyPromise?: Promise<Awaited<TConfig>>;
  private closePromise?: Promise<void>;
  private closing = false;
  private slowHandlerWarned = false;
  private readonly instances = new Set<Server>();
  private readonly schemes = new Map<string, SecurityScheme[] | undefined>();
  private readonly monitoringEntry = createMiddlewareEntry();

  constructor(
    private readonly config: ServerDefinitionConfig<
      TTools,
      TConfig,
      TAuthExtra
    >,
    private readonly middleware: readonly McpMiddlewareEntry[],
    private readonly options: ServerExecutionOptions<TTools, TAuthExtra>,
  ) {}

  ready(): Promise<Awaited<TConfig>> {
    if (this.closing) {
      return Promise.reject(new Error("The server execution is closed"));
    }
    this.readyPromise ??= (async (): Promise<Awaited<TConfig>> => {
      this.dependencies = await this.config.setup?.();
      this.initialized = true;
      return this.dependencies as Awaited<TConfig>;
    })().catch((error) => {
      this.readyPromise = undefined;
      throw error;
    });
    return this.readyPromise;
  }

  get securitySchemesByTool(): ReadonlyMap<
    string,
    SecurityScheme[] | undefined
  > {
    return this.schemes;
  }

  async createServerInstance(): Promise<Server> {
    await this.ready();
    if (this.closing) {
      throw new Error("The server execution is closed");
    }
    const {
      name = "skybridge",
      version = VERSION,
      title,
      description,
      icons,
      websiteUrl,
      setup: _setup,
      dispose: _dispose,
      handler,
      skills,
      ...serverOptions
    } = this.config;
    const server = new McpServer<Record<never, ToolDef>, TAuthExtra>(
      { name, version, title, description, icons, websiteUrl },
      serverOptions,
      {
        skills,
        oauth: this.options.oauth,
        toolImplementations: this.options.toolImplementations as NonNullable<
          ConstructorParameters<typeof McpServer>[2]
        >["toolImplementations"],
      },
    );
    const instance = server.server;
    this.instances.add(instance);
    const close = instance.close.bind(instance);
    instance.close = async () => {
      try {
        await close();
      } finally {
        this.instances.delete(instance);
      }
    };
    try {
      if (this.options.resourceMetadataUrl) {
        server.setResourceMetadataUrlResolver(this.options.resourceMetadataUrl);
      }
      const startedAt = performance.now();
      const built = handler(server, this.dependencies as Awaited<TConfig>);
      const elapsed = performance.now() - startedAt;
      if (typeof (built as { then?: unknown }).then === "function") {
        throw new Error(
          "The Skybridge handler must be synchronous — it runs on every request. Load config or secrets in `setup` instead and read them from the handler's second argument.",
        );
      }
      if (built.server !== instance) {
        throw new Error("The handler must return the server it receives");
      }
      if (elapsed > 50 && !this.slowHandlerWarned) {
        this.slowHandlerWarned = true;
        console.warn(
          `The Skybridge handler took ${Math.round(elapsed)}ms — it runs on every request, so this cost is paid per request. Move expensive work into \`setup\`, whose result is passed to the handler.`,
        );
      }
      const unknownTools = Object.keys(
        this.options.toolImplementations ?? {},
      ).filter((tool) => !built.securitySchemesByTool.has(tool));
      if (unknownTools.length) {
        throw new Error(
          `the app exposes no tool named ${unknownTools.map((name) => `"${name}"`).join(", ")}, so the stub would never run`,
        );
      }
      for (const [name, schemes] of built.securitySchemesByTool) {
        this.schemes.set(name, schemes);
      }
      instrumentHandlers(instance, [
        ...(this.monitoringEntry ? [this.monitoringEntry] : []),
        ...this.middleware,
        ...built.protocolMiddlewareEntries(),
      ]);
      return instance;
    } catch (error) {
      await instance.close();
      throw error;
    }
  }

  close() {
    this.closePromise ??= this.dispose();
    return this.closePromise;
  }

  private async dispose() {
    this.closing = true;
    await this.readyPromise?.catch(() => {});
    const results = await Promise.allSettled(
      [...this.instances].map((instance) => instance.close()),
    );
    try {
      if (this.initialized) {
        await this.config.dispose?.(this.dependencies as Awaited<TConfig>);
      }
    } finally {
      this.dependencies = undefined;
      this.schemes.clear();
    }
    const errors = results
      .filter((result) => result.status === "rejected")
      .map((result) => result.reason);
    if (errors.length) {
      throw new AggregateError(errors, "Failed to close server instances");
    }
  }
}
