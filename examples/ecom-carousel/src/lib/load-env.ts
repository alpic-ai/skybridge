import { existsSync } from "node:fs";

// Load .env into process.env as an import side effect (native to Node, no
// dependency). Imported first so values are available to module-level code —
// e.g. a view's CSP domains — that runs before any tool handler.
if (existsSync(".env")) {
  process.loadEnvFile();
}
