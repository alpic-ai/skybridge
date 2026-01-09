import express, { type Express } from "express";
import { widgetsDevServer } from "skybridge/server";
import type { ViteDevServer } from "vite";
import { getCapitalByCountryCode } from "./capitals.js";
import { env } from "./env.js";
import { mcp } from "./middleware.js";
import server from "./server.js";

const app = express() as Express & { vite: ViteDevServer };

app.use(express.json());

// API endpoint for fetching capital details on demand
app.get("/api/capital/:cca2", async (req, res) => {
  try {
    const { cca2 } = req.params;

    // Validate that cca2 is a valid 2-letter country code format
    if (!cca2 || cca2.length !== 2 || !/^[A-Za-z]{2}$/.test(cca2)) {
      return res.status(400).json({
        error:
          "Invalid country code format. Expected a 2-letter ISO 3166-1 alpha-2 code.",
      });
    }

    const capital = await getCapitalByCountryCode(cca2);
    res.json(capital);
  } catch (error) {
    res.status(404).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.use(mcp(server));

if (env.NODE_ENV !== "production") {
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
  console.log(
    "Make your local server accessible with 'ngrok http 3000' and connect to ChatGPT with URL https://xxxxxx.ngrok-free.app/mcp",
  );
});

process.on("SIGINT", async () => {
  console.log("Server shutdown complete");
  process.exit(0);
});
