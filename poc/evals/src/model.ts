import type { LanguageModel } from "ai";
import type { ModelDescriptor } from "./config.js";

let registered: LanguageModel | undefined;

/**
 * Registers a model instance from a setup file. The escape hatch for providers
 * the descriptor cannot construct, such as a company LLM gateway.
 */
export function defineEvalModel(model: LanguageModel): void {
  registered = model;
}

const DEFAULT_KEY_ENV = { anthropic: "ANTHROPIC_API_KEY" } as const;

function requireKey(descriptor: ModelDescriptor): string {
  const name = descriptor.apiKeyEnv ?? DEFAULT_KEY_ENV[descriptor.provider];
  const key = process.env[name];
  if (key === undefined || key === "") {
    throw new Error(`${name} is not set`);
  }
  return key;
}

export async function resolveModel(
  descriptor: ModelDescriptor | undefined,
): Promise<LanguageModel> {
  if (registered !== undefined) {
    return registered;
  }
  if (descriptor === undefined) {
    throw new Error(
      "No model configured. Pass `model` to the evals plugin, or call defineEvalModel() from a setup file.",
    );
  }
  const { createAnthropic } = await import("@ai-sdk/anthropic");
  return createAnthropic({ apiKey: requireKey(descriptor) })(descriptor.name);
}
