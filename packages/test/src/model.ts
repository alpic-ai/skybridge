import { createAnthropic } from "@ai-sdk/anthropic";
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

export function resolveModel(
  descriptor: ModelDescriptor | undefined,
): LanguageModel {
  if (registered !== undefined) {
    return registered;
  }
  if (descriptor === undefined) {
    throw new Error(
      "No model configured. Pass `model` to the evals plugin, or call defineEvalModel() from a setup file.",
    );
  }
  const name = descriptor.apiKeyEnv ?? "ANTHROPIC_API_KEY";
  const apiKey = process.env[name];
  if (apiKey === undefined || apiKey === "") {
    throw new Error(`${name} is not set`);
  }
  return createAnthropic({ apiKey })(descriptor.name);
}
