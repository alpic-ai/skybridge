import type { LanguageModel } from "ai";

type ProviderFactory = (modelId: string) => LanguageModel;

const PROVIDERS: Record<string, () => Promise<ProviderFactory>> = {
  anthropic: () => import("@ai-sdk/anthropic").then((m) => m.anthropic),
  google: () => import("@ai-sdk/google").then((m) => m.google),
  mistral: () => import("@ai-sdk/mistral").then((m) => m.mistral),
  openai: () => import("@ai-sdk/openai").then((m) => m.openai),
};

let registered: LanguageModel | undefined;

/**
 * Registers a model instance from a setup file, taking precedence over the
 * configured `model` string. The escape hatch for anything the provider
 * prefixes cannot express, such as a local runtime or a company LLM gateway.
 */
export function defineEvalModel(model: LanguageModel): void {
  registered = model;
}

/**
 * Turns a `provider/model-id` string into a model instance, importing only the
 * provider named. Each provider package reads its own conventional API key
 * variable, so no key configuration is needed. An unrecognised prefix is
 * returned untouched for the AI SDK's default provider to resolve.
 */
export async function resolveModel(
  spec: string | undefined,
): Promise<LanguageModel> {
  if (registered !== undefined) {
    return registered;
  }
  if (spec === undefined) {
    throw new Error(
      "No model configured. Set `model` on the evals plugin, or call defineEvalModel() from a setup file.",
    );
  }
  const separator = spec.indexOf("/");
  if (separator === -1) {
    return spec;
  }
  const name = spec.slice(0, separator);
  const load = PROVIDERS[name];
  if (load === undefined) {
    return spec;
  }
  const provider = await load().catch(() => {
    throw new Error(
      `The model "${spec}" needs @ai-sdk/${name}@^2. Install it as a dev dependency.`,
    );
  });
  return provider(spec.slice(separator + 1));
}
