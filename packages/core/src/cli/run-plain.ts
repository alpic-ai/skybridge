import type { TunnelManager, TunnelState } from "./tunnel.js";
import { startNodemon } from "./use-nodemon.js";
import { startTypeScriptCheck, type TsError } from "./use-typescript-check.js";

export interface RunPlainOptions {
  env: NodeJS.ProcessEnv;
  port: number;
  fallback: boolean;
  version: string;
  tunnel: boolean;
  tunnelManager: TunnelManager;
}

// Banner/URLs/diagnostics go to stderr so a downstream pipe (e.g.
// `skybridge dev --plain | bunyan`) only ever sees the server's own stdout.
function info(message: string): void {
  process.stderr.write(`${message}\n`);
}

function describeTunnel(state: TunnelState, port: number): string {
  switch (state.status) {
    case "starting":
      return `🌍  ${state.message}`;
    case "connected":
      return `🌍  Exposed on ${state.url}/mcp\n→  Test with an LLM on Playground: ${state.url}/try`;
    case "error":
      return `🌍  Cannot open tunnel: ${state.message}\n→  Try manually: npx alpic tunnel --port ${port}`;
    default:
      return "";
  }
}

/**
 * Run `skybridge dev` without the Ink UI. The server's stdout is forwarded
 * verbatim to the real stdout so it can be piped through a formatter
 * (`skybridge dev --plain | bunyan`); everything else (banner, URLs, tunnel
 * state, TypeScript errors, restarts) is written to stderr.
 *
 * Returns a cleanup function that tears down nodemon and the tsc watcher.
 */
export function runPlain(options: RunPlainOptions): () => void {
  const { env, port, fallback, version, tunnel, tunnelManager } = options;

  info(`⛰  Skybridge v${version}`);
  info(
    fallback
      ? `🏠  3000 in use, running on http://localhost:${port}/mcp`
      : `🏠  Running on http://localhost:${port}/mcp`,
  );
  info(`→  Test locally with DevTools: http://localhost:${port}/`);
  if (!tunnel) {
    info("🌍  Get a public URL and LLM Playground access with --tunnel.");
  }

  const stopNodemon = startNodemon(env, {
    onStdout: (line) => process.stdout.write(`${line}\n`),
    onStderr: (message) => info(message),
    onRestart: (files) =>
      info(`✓  Server restarted due to file changes: ${files.join(", ")}`),
  });

  let lastTsErrorKey = "";
  const stopTypeScriptCheck = startTypeScriptCheck((errors: Array<TsError>) => {
    // tsc re-emits on every save; only print when the error set actually changes.
    const key = errors
      .map((e) => `${e.file}:${e.line}:${e.col}:${e.message}`)
      .join("|");
    if (key === lastTsErrorKey) {
      return;
    }
    lastTsErrorKey = key;
    if (errors.length === 0) {
      return;
    }
    info("⚠️  TypeScript errors found:");
    for (const error of errors) {
      info(`  ${error.file}(${error.line},${error.col}): ${error.message}`);
    }
  });

  const unsubscribeTunnel = tunnel
    ? tunnelManager.subscribe((state) => {
        const message = describeTunnel(state, port);
        if (message) {
          info(message);
        }
      })
    : () => {};

  if (tunnel) {
    tunnelManager.start();
  }

  return () => {
    unsubscribeTunnel();
    stopNodemon();
    stopTypeScriptCheck();
  };
}
