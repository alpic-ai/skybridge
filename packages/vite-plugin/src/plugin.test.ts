import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { UserConfig } from "vite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type SkybridgePluginOptions, skybridge } from "./plugin.js";

type RenderBuiltUrl = NonNullable<
  NonNullable<UserConfig["experimental"]>["renderBuiltUrl"]
>;

function getConfig(root: string, options?: SkybridgePluginOptions): UserConfig {
  const plugin = skybridge({ viewsDir: join(root, "views"), ...options });
  const hook = plugin.config;
  if (!hook) {
    throw new Error("plugin.config is not defined");
  }
  const handler = typeof hook === "function" ? hook : hook.handler;
  return handler.call(
    // biome-ignore lint/suspicious/noExplicitAny: vitest harness for plugin hook
    {} as any,
    { root },
    { command: "build", mode: "production" },
  ) as UserConfig;
}

function getRenderBuiltUrl(root: string): RenderBuiltUrl {
  const config = getConfig(root);

  const renderBuiltUrl = config.experimental?.renderBuiltUrl;
  if (!renderBuiltUrl) {
    throw new Error("experimental.renderBuiltUrl is not defined");
  }
  return renderBuiltUrl;
}

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "skybridge-plugin-"));
  mkdirSync(join(root, "views"), { recursive: true });
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("skybridge plugin renderBuiltUrl", () => {
  // Assets referenced from JS can't use `import.meta.url`: views render in a
  // host sandbox iframe (web-sandbox.oaiusercontent.com), so the module origin
  // doesn't point back at the Skybridge server. They have to be resolved at
  // runtime against `window.skybridge.serverUrl` instead.
  it("resolves JS asset references against window.skybridge.serverUrl", () => {
    const renderBuiltUrl = getRenderBuiltUrl(root);

    expect(
      renderBuiltUrl("assets/logo-BXtQ8kd2.png", {
        hostId: "assets/view-CwF9pQ1a.js",
        hostType: "js",
        type: "asset",
        ssr: false,
      }),
    ).toEqual({
      runtime: `window.skybridge.serverUrl + "/assets/assets/logo-BXtQ8kd2.png"`,
    });
  });

  // Reproducer for the CSS build failure: Vite has nowhere to evaluate a
  // runtime expression inside a stylesheet, so `{ runtime }` makes
  // `vite:css-post` throw for any `url()` in CSS. It isn't needed either — the
  // stylesheet is served from `${serverUrl}/assets/…`, and a relative `url()`
  // resolves against the stylesheet's own URL, tunnel origin included.
  it("resolves CSS asset references relatively", () => {
    const renderBuiltUrl = getRenderBuiltUrl(root);

    expect(
      renderBuiltUrl("assets/demo-0IQFxQqs.woff2", {
        hostId: "assets/style-DmQ2xY7b.css",
        hostType: "css",
        type: "asset",
        ssr: false,
      }),
    ).toEqual({ relative: true });
  });
});

describe("skybridge plugin eval discovery", () => {
  it("collects eval scenarios even when the evals option is missing", () => {
    const config = getConfig(root);

    expect(config.test?.include).toContain("evals/**/*.eval.?(c|m)ts");
    expect(config.test?.setupFiles).toBeUndefined();
  });
});
