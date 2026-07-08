import path from "node:path";

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
