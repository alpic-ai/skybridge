import type { Plugin } from "vite";

// Mirrors Vite's own `isCSSRequest`: matches the css family of extensions
// either at the end of the id or right before the query string. Catches both
// plain `.css` requests and SFC style blocks (e.g. `Foo.vue?vue&type=style&lang.css`).
const CSS_LANGS_RE =
  /\.(css|less|sass|scss|styl|stylus|pcss|postcss|sss)(?:$|\?)/;

export function isCssRequest(id: string): boolean {
  return CSS_LANGS_RE.test(id);
}

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
    transform(code, id) {
      if (!code) {
        return null;
      }

      // Vite serves CSS modules as JS that embeds the stylesheet as a string
      // literal. Rewriting `url("/foo.woff2")` inside that string to a JS
      // concatenation expression produces invalid CSS once it lands in a
      // <style> tag. CSS asset URLs are already handled at build time by
      // `experimental.renderBuiltUrl`, so skip CSS requests here.
      if (isCssRequest(id)) {
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
