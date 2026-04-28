import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ConfigEnv, UserConfig } from "vite";
import { skybridge } from "./plugin.js";

const DEFAULT_VIEW = "export default function V() { return null; }";
const FAKE_ENV: ConfigEnv = { command: "serve", mode: "development" };

function callPluginConfig(
  root: string,
  userConfig: UserConfig = {},
): UserConfig {
  const plugin = skybridge();
  const configHook = plugin.config;
  if (typeof configHook !== "function") {
    throw new Error("skybridge plugin must expose a config hook");
  }
  const result = configHook.call(
    {
      // The hook only needs `root` from the user config; other fields are
      // forwarded so we test against the same shape Vite would pass.
    } as never,
    { root, ...userConfig },
    FAKE_ENV,
  );
  if (!result || result instanceof Promise) {
    throw new Error(
      "expected skybridge plugin config hook to return a sync object",
    );
  }
  return result as UserConfig;
}

describe("skybridge plugin config hook — optimizeDeps contract", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "skybridge-plugin-"));
    const viewsDir = join(root, "src", "views");
    mkdirSync(viewsDir, { recursive: true });
    writeFileSync(join(viewsDir, "demo.tsx"), DEFAULT_VIEW);
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("does not override user optimizeDeps.exclude / esbuildOptions / extra include", () => {
    const result = callPluginConfig(root, {
      optimizeDeps: {
        exclude: ["@facile-it/full-metal-ui"],
        include: ["card-validator"],
        esbuildOptions: { target: "es2022" },
      },
    });

    expect(result.optimizeDeps?.exclude).toBeUndefined();
    expect(result.optimizeDeps?.esbuildOptions).toBeUndefined();
    expect(result.optimizeDeps?.entries).toBeDefined();
    expect(result.optimizeDeps?.include).toEqual(
      expect.arrayContaining([
        "react",
        "react-dom/client",
        "react/jsx-runtime",
        "skybridge/web",
      ]),
    );
  });

  it("does not return any field that would mask user-supplied include entries on merge", () => {
    const result = callPluginConfig(root);

    const include = result.optimizeDeps?.include ?? [];
    expect(Array.isArray(include)).toBe(true);
    for (const entry of include) {
      expect(typeof entry).toBe("string");
    }
  });
});
