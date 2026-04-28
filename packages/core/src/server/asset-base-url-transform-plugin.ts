import type { Plugin } from "vite";

/**
 * Transforms asset import paths to resolve at runtime via `window.skybridge.serverUrl`,
 * so they work both locally and behind tunnels.
 */
export function assetBaseUrlTransform(code: string): string {
  const assetStringPattern =
    /(?<!\bfrom\s)(?<!https?:\/\/)(["'`])(\/[^"'`]+\.(svg|png|jpeg|jpg|gif|webp|mp3|mp4|woff|woff2|ttf|eot))\1/g;

  code = code.replace(assetStringPattern, (_match, _quote, assetPath) => {
    return `(window.skybridge?.serverUrl ?? "") + "${assetPath}"`;
  });

  return code;
}

/**
 * Vite plugin that transforms asset import paths to resolve at runtime via `window.skybridge.serverUrl`.
 */
export function assetBaseUrlTransformPlugin(): Plugin {
  return {
    name: "asset-base-url-transform",
    transform(code) {
      if (!code) {
        return null;
      }

      const transformedCode = assetBaseUrlTransform(code);

      if (transformedCode === code) {
        return null;
      }

      return {
        code: transformedCode,
        map: null,
      };
    },
  };
}
