export type AssetHostType = "js" | "css" | "html";

export function renderBuiltAssetUrl(
  filename: string,
  hostType: AssetHostType,
): { runtime: string } | { relative: true } {
  if (hostType !== "js") {
    return { relative: true };
  }
  return {
    runtime: `window.skybridge.serverUrl + "/assets/${filename}"`,
  };
}
