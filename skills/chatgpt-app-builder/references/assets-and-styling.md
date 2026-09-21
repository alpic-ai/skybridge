# Assets and Styling

Views are bundled by Vite and served under `/assets` by the Skybridge server.

## Images and files

Import from the source tree; Vite hashes the name and the built code resolves it against the server URL at runtime (works behind tunnels and path prefixes):

```tsx
import logo from "../assets/logo.svg";
<img src={logo} alt="Logo" />
```

For stable names or dynamic references, put files in `public/` at the project root. They are copied to `dist/assets/` and served at `/assets/<file>`. Views run in the host's sandbox iframe, so a bare `"/assets/hero.png"` in JSX resolves against the wrong origin in production. Prefix with the injected server URL:

```tsx
<img src={`${window.skybridge.serverUrl}/assets/hero.png`} alt="Hero" />
```

In CSS, `url("/assets/hero.png")` works without a prefix. Third-party origins need `resourceDomains` in the tool's CSP (see [csp.md](csp.md)).

## CSS

Import stylesheets from any view or component file (`import "./product.css"`). Skybridge sets `cssCodeSplit: false`, so all CSS is bundled into one `style.css` shared by every view.

Tailwind v4: `@apply` in a stylesheet other than the one importing `tailwindcss` fails with `Cannot apply unknown utility class`. Add `@reference "<path to main stylesheet>";` at the top of that file.

## Vite config

`vite.config.ts` is a standard Vite config; `skybridge()` is a plugin. Plugins, aliases, `define`, `css`, `server.forwardConsole` and `build.sourcemap`/`build.target` work as usual. The plugin overrides `base`, `build.outDir`, `build.emptyOutDir`, `build.manifest`, `build.minify`, `build.cssCodeSplit`, `build.rollupOptions.input`, `resolve.dedupe`, `experimental.renderBuiltUrl`, and in dev `server.middlewareMode`, `server.hmr`, `server.allowedHosts`. Plugin options: `viewsDir` (views folder) and `serverExternal` (packages kept out of the server bundle).
