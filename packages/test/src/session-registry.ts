import { createMcpHandler, type Server } from "@modelcontextprotocol/server";
import type { LanguageModel } from "ai";
import type { ToolInput, ToolNames } from "skybridge/server";
import { inject, onTestFinished } from "vitest";
import { Chat, type StubMap } from "./chat.js";

/**
 * The minimum a Skybridge app has to expose to be served in-process: the
 * `$types` marker the assertions infer tool names from, and the per-request
 * server builder the session's handler is built on. Structural on purpose, so
 * this package needs no runtime dependency on `skybridge`.
 */
export interface EvalApp {
  readonly $types: { readonly tools: object };
  createServerInstance(): Promise<Server>;
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

/**
 * Opens a fresh MCP session and conversation against the app under test. The
 * app is served in-process by a handler built on `app.createServerInstance`
 * for this conversation alone, and both are closed when the current test
 * finishes, so scenarios never leak sessions and never write teardown, and
 * tests that run concurrently cannot close each other's sessions.
 *
 * The assertions are inferred from the app value itself, so `expect.chat` gets
 * the project's tool names and argument shapes with no type parameter.
 *
 * `stubs` answers a tool from the scenario instead of the app, so a case that
 * depends on today's date or on a live catalogue still reads the same weeks
 * later. A stubbed call never reaches the server, and still shows up in
 * `chat.toolCalls` like any other. See {@link ToolStubs}.
 *
 * `authInfo` claims an identity for the session: the app's per-tool scheme and
 * scope enforcement runs against it for real, only token verification is
 * skipped. Omit it to exercise the anonymous path, challenges included.
 */
export async function start<App extends EvalApp>(
  options: StartOptions & {
    app: App;
    authInfo?: EvalIdentity;
    stubs?: ToolStubs<App>;
  },
): Promise<Chat<App>> {
  const config = sharedDefaults();
  const { app, authInfo } = options;
  const handler = createMcpHandler(() => app.createServerInstance());

  const chat = await Chat.open<App>(
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
    (options.stubs ?? {}) as StubMap,
  );

  onTestFinished(async () => {
    await chat.close();
    await handler.close();
  });
  return chat;
}
