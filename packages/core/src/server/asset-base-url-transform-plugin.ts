import type { Plugin } from "vite";

/**
 * Transforms asset import paths to use the development server base URL.
 */
export function assetBaseUrlTransform(
  code: string,
  devServerOrigin: string,
): string {
  const assetStringPattern =
    /(?<!https?:\/\/)(["'`])(\/[^"'`]+\.(svg|png|jpeg|jpg|gif|webp|mp3|mp4|woff|woff2|ttf|eot))\1/g;

  code = code.replace(assetStringPattern, (_match, quote, assetPath) => {
    return `${quote}${devServerOrigin}${assetPath}${quote}`;
  });

  return code;
}

/**
 * Vite plugin that transforms asset import paths to use the development server base URL.
 */
export function assetBaseUrlTransformPlugin(options: {
  devServerOrigin: string;
}): Plugin {
  const { devServerOrigin } = options;

  return {
    name: "asset-base-url-transform",
    enforce: "pre",
    transform(code) {
      if (!code) {
        return null;
      }

      const transformedCode = assetBaseUrlTransform(code, devServerOrigin);

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
