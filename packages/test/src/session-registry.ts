import type { LanguageModel } from "ai";
import { inject, onTestFinished } from "vitest";
import { Chat } from "./chat.js";

/**
 * The minimum a Skybridge app has to expose to be served in-process: the
 * `$types` marker the assertions infer tool names from, and the fetch handler
 * the session is dialed through. Structural on purpose, so this package needs
 * no runtime dependency on `skybridge`.
 */
export interface EvalApp {
  readonly $types: { readonly tools: object };
  readonly fetchHandler: {
    fetch: (request: Request) => Promise<Response>;
  };
}

interface StartOptions {
  /** Any AI SDK model instance, built by the project. */
  model: LanguageModel;
  systemPrompt?: string;
  temperature?: number;
  maxSteps?: number;
}

const IN_PROCESS_URL = "http://in-process.skybridge.test/mcp";

function sharedDefaults() {
  try {
    return inject("skybridgeEvals");
  } catch {
    return undefined;
  }
}

/**
 * Opens a fresh MCP session and conversation against the app under test. Pass
 * `app` to serve it in-process, or omit it to reach the server the Vite plugin
 * started. Either way the session is closed when the current test finishes, so
 * scenarios never leak sessions and never write teardown, and tests that run
 * concurrently cannot close each other's sessions.
 *
 * In-process mode infers the assertions from the app value itself, so
 * `expect.chat` gets the project's tool names and argument shapes with no type
 * parameter. It talks straight to `app.fetchHandler`, which never closes: the
 * handler is memoized on the app and shared by every test.
 */
export async function start<App extends EvalApp>(
  options: StartOptions & { app: App },
): Promise<Chat<App>>;
/**
 * The type parameter pins the assertions to the project's registry:
 * `start<AppType>()` returns a `Chat<AppType>`, and `expect.chat` infers the
 * tool names and argument shapes from it.
 */
export async function start<App>(options: StartOptions): Promise<Chat<App>>;
export async function start<App>(
  options: StartOptions & { app?: EvalApp },
): Promise<Chat<App>> {
  const config = sharedDefaults();
  const host = {
    model: options.model,
    temperature: options.temperature ?? config?.temperature,
    systemPrompt: options.systemPrompt ?? config?.systemPrompt,
    maxSteps: options.maxSteps ?? config?.maxSteps,
  };

  const chat = await (options.app === undefined
    ? Chat.open<App>(urlFromPlugin(), host)
    : inProcessChat<App>(options.app, host));

  onTestFinished(() => chat.close());
  return chat;
}

function urlFromPlugin(): string {
  const url = inject("skybridgeEvalsUrl");
  if (url === undefined) {
    throw new Error(
      "No eval server is running. Pass `app` to `start` to serve the app in-process, or add `skybridge({ evals: {...} })` to the vitest config.",
    );
  }
  return url;
}

function inProcessChat<App>(
  app: EvalApp,
  host: Parameters<typeof Chat.open>[1],
): Promise<Chat<App>> {
  return Chat.open<App>(IN_PROCESS_URL, host, (url, init) =>
    app.fetchHandler.fetch(new Request(url, init)),
  );
}
