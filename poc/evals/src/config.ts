/** A provider we can construct ourselves, so no extra file is needed. */
export interface ModelDescriptor {
  provider: "anthropic";
  name: string;
  /** Env var holding the key. Never the key itself. */
  apiKeyEnv?: string;
}

/** Escape hatch: a module that calls `defineEvalModel` with its own instance. */
export interface ModelFile {
  file: string;
}

export interface EvalsOptions {
  model: ModelDescriptor | ModelFile;
  temperature?: number;
  systemPrompt?: string;
  maxSteps?: number;
  runs?: number;
  threshold?: number;
  server?: string;
  project?: {
    cwd: string;
    command: string[];
    env?: Record<string, string>;
  };
}

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
