import express, { type Express } from "express";

import type { ViteDevServer } from "vite";
import { env } from "./env.js";
import { mcp } from "./middleware.js";
import server from "./server.js";

const app = express() as Express & { vite: ViteDevServer };

app.use(express.json());

app.use(mcp(server));

if (env.NODE_ENV !== "production") {
  const { widgetsDevServer } = await import("skybridge/server");
  const { devtoolsStaticServer } = await import("@skybridge/devtools");
  app.use(await devtoolsStaticServer());
  app.use(await widgetsDevServer());
}

app.listen(3000, (error) => {
  if (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }

  console.log(`Server listening on port 3000 - ${env.NODE_ENV}`);
});

process.on("SIGINT", async () => {
  console.log("Server shutdown complete");
  process.exit(0);
});
