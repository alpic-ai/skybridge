import path from "node:path";

/**
 * Start a watch-mode Vite build of the views for `dev --tunnel`.
 *
 * Writes hashed bundles + a manifest to `dist/assets` and rebuilds
 * incrementally on view changes. The dev server serves that output to remote
 * (tunnel) hosts so the first render fetches ~2 files instead of the unbundled
 * dev server's per-module waterfall.
 *
 * Runs in the long-lived CLI process (not the nodemon-restarted server) and is
 * fire-and-forget: the view handler falls back to the unbundled entry until the
 * first build lands.
 */
export function startTunnelViewBuild(root = process.cwd()): void {
  void (async () => {
    const { build } = await import("vite");
    await build({
      root,
      configFile: path.join(root, "vite.config.ts"),
      mode: "development",
      logLevel: "warn",
      build: { watch: {}, minify: false },
    });
  })().catch((err) => {
    console.error("skybridge: tunnel view build failed", err);
  });
}
