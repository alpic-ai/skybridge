import {
  type CallToolResult,
  createMcpHandler,
  type Server,
} from "@modelcontextprotocol/server";
import type { LanguageModel } from "ai";
import type {
  McpTypedMiddlewareFn,
  ToolInput,
  ToolNames,
} from "skybridge/server";
import { inject, onTestFinished } from "vitest";
import { Chat, type StubMap } from "./chat.js";
import { EvalMiddleware } from "./eval-middleware.js";

export interface EvalServer {
  readonly $types: { readonly tools: object };
  mcpMiddleware<M extends "tools/list" | "tools/call">(
    method: M,
    handler: McpTypedMiddlewareFn<M>,
  ): EvalServer;
  createExecution(options?: {
    toolImplementations?: Record<
      string,
      (
        args: unknown,
      ) => CallToolResult | undefined | Promise<CallToolResult | undefined>
    >;
  }): {
    createServerInstance(): Promise<Server>;
    close(): Promise<void>;
  };
}

export interface EvalApp {
  readonly server: EvalServer;
}

/**
 * The identity an in-process session claims, handed to the app as the
 * request's `authInfo`. Mirrors the SDK's `AuthInfo` structurally; `extra`
 * carries whatever claims the app's verifier would have produced.
 */
export interface EvalIdentity {
  token: string;
  clientId: string;
  scopes: string[];
  expiresAt?: number;
  resource?: URL;
  extra?: Record<string, unknown>;
}

/**
 * Results the runner answers with instead of calling the app, keyed by tool
 * name and typed against the project's own registry. A stub may be async, and
 * one that returns `undefined` falls through to the real server, so a scenario
 * can pin one set of arguments and leave the rest live.
 */
export type ToolStubs<App> = {
  [Name in ToolNames<App>]?: (args: ToolInput<App, Name>) => unknown;
};

interface StartOptions {
  /** Any AI SDK model instance, built by the project. */
  model: LanguageModel;
  systemPrompt?: string;
  temperature?: number;
  maxSteps?: number;
}

function sharedDefaults() {
  try {
    return inject("skybridgeEvals");
  } catch {
    return undefined;
  }
}

export async function start<Service extends EvalServer>(
  options: StartOptions & {
    authInfo?: EvalIdentity;
    stubs?: ToolStubs<Service>;
  } & (
      | { server: Service; app?: never }
      | { app: { server: Service }; server?: never }
    ),
): Promise<Chat<Service>> {
  const config = sharedDefaults();
  const { authInfo } = options;
  const server = options.app ? options.app.server : options.server;
  const middleware = new EvalMiddleware();
  const stubs = (options.stubs ?? {}) as StubMap;
  const execution = middleware.compose(server).createExecution({
    toolImplementations: Object.fromEntries(
      Object.entries(stubs).map(([name, stub]) => [
        name,
        async (args: unknown) => {
          const result = await stub(args as Record<string, unknown>);
          return result === undefined
            ? undefined
            : {
                content: [
                  {
                    type: "text" as const,
                    text:
                      typeof result === "string"
                        ? result
                        : JSON.stringify(result),
                  },
                ],
              };
        },
      ]),
    ),
  });
  const handler = createMcpHandler(() => execution.createServerInstance());
  const close = async () => {
    try {
      await handler.close();
    } finally {
      await execution.close();
    }
  };
  let chat: Chat<Service>;
  try {
    const sample = await execution.createServerInstance();
    await sample.close();
    chat = await Chat.open<Service>(
      {
        model: options.model,
        temperature: options.temperature ?? config?.temperature,
        systemPrompt: options.systemPrompt ?? config?.systemPrompt,
        maxSteps: options.maxSteps ?? config?.maxSteps,
      },
      (url, init) =>
        handler.fetch(
          new Request(url, init),
          authInfo === undefined ? undefined : { authInfo },
        ),
      middleware,
      close,
    );
  } catch (error) {
    await Promise.allSettled([middleware.files.close(), close()]);
    throw error;
  }

  onTestFinished(async () => {
    await chat.close();
  });
  return chat;
}
