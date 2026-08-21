import type { EvalsOptions, ModelDescriptor } from "@skybridge/vite-plugin";

export type {
  EvalsOptions,
  ModelDescriptor,
  ModelFile,
} from "@skybridge/vite-plugin";

/** The serializable half, the only part that crosses into the workers. */
export type ProvidedEvalsOptions = Omit<EvalsOptions, "model"> & {
  model?: ModelDescriptor;
};

declare module "vitest" {
  interface ProvidedContext {
    skybridgeEvals: ProvidedEvalsOptions;
    skybridgeEvalsUrl: string;
  }
}
