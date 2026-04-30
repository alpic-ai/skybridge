export async function resolveViewsDir(root: string): Promise<string | undefined> {
  const { loadConfigFromFile } = await import("vite");
  const loaded = await loadConfigFromFile(
    { command: "build", mode: "production" },
    undefined,
    root,
  );

  const isPluginCandidate = (
    value: unknown,
  ): value is { name?: string; api?: { viewsDir?: string } } =>
    typeof value === "object" && value !== null;

  const plugins: Array<{ name?: string; api?: { viewsDir?: string } }> = [];
  const walk = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(walk);
    } else if (isPluginCandidate(value)) {
      plugins.push(value);
    }
  };
  walk(loaded?.config.plugins ?? []);
  return plugins.find((p) => p.name === "skybridge")?.api?.viewsDir;
}
