import { beforeEach, describe, expect, it, vi } from "vitest";

async function freshModel() {
  vi.resetModules();
  return await import("./model.js");
}

describe("resolveModel", () => {
  beforeEach(() => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
  });

  it("imports only the provider named by the prefix", async () => {
    const { resolveModel } = await freshModel();
    const model = await resolveModel("anthropic/claude-sonnet-4-5");
    expect(model).toMatchObject({
      provider: "anthropic.messages",
      modelId: "claude-sonnet-4-5",
    });
  });

  it("passes an unrecognised prefix through for the SDK default provider", async () => {
    const { resolveModel } = await freshModel();
    await expect(resolveModel("acme/some-model")).resolves.toBe(
      "acme/some-model",
    );
  });

  it("prefers a model registered from a setup file", async () => {
    const { defineEvalModel, resolveModel } = await freshModel();
    const custom = { specificationVersion: "v2" } as never;
    defineEvalModel(custom);
    await expect(resolveModel("anthropic/claude-sonnet-4-5")).resolves.toBe(
      custom,
    );
  });
});

describe("resolveModel without configuration", () => {
  it("explains that neither a model string nor a registration was provided", async () => {
    const { resolveModel } = await freshModel();
    await expect(resolveModel(undefined)).rejects.toThrow(
      /No model configured/,
    );
  });
});
