export const getAssetUrl = (path: string): string =>
  new URL(path, import.meta.url).href;
