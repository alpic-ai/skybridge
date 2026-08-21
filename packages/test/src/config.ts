import type { EvalsOptions } from "@skybridge/vite-plugin";

export type { EvalsOptions } from "@skybridge/vite-plugin";

declare module "vitest" {
  interface ProvidedContext {
    skybridgeEvals: EvalsOptions;
    skybridgeEvalsUrl: string;
  }
}
