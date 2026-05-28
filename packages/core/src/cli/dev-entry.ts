import path from "node:path";
import { pathToFileURL } from "node:url";

// `skybridge dev` execs this file via tsx. tsx hooks Node's loader so the
// dynamic import of the user's `src/server.ts` is transpiled on the fly.
// We don't set the Vite manifest here — Vite middleware serves views in dev —
// and only call run() when the export is still an McpServer instance, so
// legacy templates that top-level-await run() themselves stay no-op here.
const userServerPath = path.join(process.cwd(), "src", "server.ts");
const mod = await import(pathToFileURL(userServerPath).href);
const userExport = mod.default;

if (userExport && typeof userExport.run === "function") {
  await userExport.run();
}
