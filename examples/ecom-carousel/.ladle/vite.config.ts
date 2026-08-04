import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import { defineConfig } from "vite";

/**
 * Ladle-only vite config. Intentionally omits the Skybridge plugin (which
 * transforms MCP view boilerplate and crashes Ladle's bundler) and the
 * @vitejs/plugin-react call (Ladle provides its own).
 */
export default defineConfig({
  plugins: [vanillaExtractPlugin()],
});
