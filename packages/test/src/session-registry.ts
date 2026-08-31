import {
  createMcpHandler,
  type McpHttpHandler,
  type Server,
} from "@modelcontextprotocol/server";
import type { LanguageModel } from "ai";
import { inject, onTestFinished } from "vitest";
import { Chat } from "./chat.js";

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

const handlers = new WeakMap<EvalApp, McpHttpHandler>();

function getHandler(app: EvalApp): McpHttpHandler {
  let handler = handlers.get(app);
  if (!handler) {
    handler = createMcpHandler(() => app.createServerInstance());
    handlers.set(app, handler);
  }
  return handler;
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
 * app is served in-process, and the session is closed when the current test
 * finishes, so scenarios never leak sessions and never write teardown, and
 * tests that run concurrently cannot close each other's sessions.
 *
 * The assertions are inferred from the app value itself, so `expect.chat` gets
 * the project's tool names and argument shapes with no type parameter. The
 * session talks to an in-process handler built on `app.createServerInstance`,
 * which never closes: it is memoized per app and shared by every test.
 *
 * `authInfo` claims an identity for the session: the app's per-tool scheme and
 * scope enforcement runs against it for real, only token verification is
 * skipped. Omit it to exercise the anonymous path, challenges included.
 */
export async function start<App extends EvalApp>(
  options: StartOptions & { app: App; authInfo?: EvalIdentity },
): Promise<Chat<App>> {
  const config = sharedDefaults();
  const { app, authInfo } = options;

  const chat = await Chat.open<App>(
    {
      model: options.model,
      temperature: options.temperature ?? config?.temperature,
      systemPrompt: options.systemPrompt ?? config?.systemPrompt,
      maxSteps: options.maxSteps ?? config?.maxSteps,
    },
    (url, init) =>
      getHandler(app).fetch(
        new Request(url, init),
        authInfo === undefined ? undefined : { authInfo },
      ),
  );

  onTestFinished(() => chat.close());
  return chat;
}
