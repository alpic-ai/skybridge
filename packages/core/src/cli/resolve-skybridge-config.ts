export interface SkybridgeConfig {
  viewsDir?: string;
  serverExternal?: string[];
}

export async function resolveSkybridgeConfig(
  root: string,
): Promise<SkybridgeConfig> {
  const { loadConfigFromFile } = await import("vite");
  const loaded = await loadConfigFromFile(
    { command: "build", mode: "production" },
    undefined,
    root,
  );

  const isPluginCandidate = (
    value: unknown,
  ): value is { name?: string; api?: SkybridgeConfig } =>
    typeof value === "object" && value !== null;

  const plugins: Array<{ name?: string; api?: SkybridgeConfig }> = [];
  const walk = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(walk);
    } else if (isPluginCandidate(value)) {
      plugins.push(value);
    }
  };
  walk(loaded?.config.plugins ?? []);
  const api = plugins.find((p) => p.name === "skybridge")?.api;
  return { viewsDir: api?.viewsDir, serverExternal: api?.serverExternal };
}
