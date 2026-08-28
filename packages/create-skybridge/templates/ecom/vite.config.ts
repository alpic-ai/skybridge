import { skybridge } from "@skybridge/vite-plugin";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig, type PluginOption } from "vite";

export default defineConfig({
  plugins: [skybridge() as PluginOption, react(), vanillaExtractPlugin()],
});
