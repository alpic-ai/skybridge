import { fileURLToPath } from "node:url";
import type { Plugin } from "vitest/config";
import type { EvalsOptions, ProvidedEvalsOptions } from "./config.js";

function here(file: string): string {
  return fileURLToPath(new URL(file, import.meta.url));
}

/**
 * Wires the eval runner into vitest. Usually reached through the `evals`
 * option of the `skybridge()` Vite plugin rather than registered directly.
 * Everything the runner needs is configured here, so a scenario file imports
 * nothing but `start` and its own `AppType`.
 */
export function evals(options: EvalsOptions): Plugin {
  const { model, ...rest } = options;
  const provided: ProvidedEvalsOptions =
    "file" in model ? rest : { ...rest, model };

  const setupFiles = [here("./setup.js")];
  if ("file" in model) {
    setupFiles.push(model.file);
  }

  return {
    name: "skybridge-evals",
    config() {
      return {
        test: {
          testTimeout: 120_000,
          setupFiles,
          globalSetup: [here("./global-setup.js")],
          provide: { skybridgeEvals: provided },
        },
      };
    },
  };
}
