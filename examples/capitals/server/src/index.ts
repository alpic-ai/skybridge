import { type Request, type Response, Router } from "express";
import { McpServer } from "skybridge/server";
import * as z from "zod";
import {
  type Capital,
  type CapitalSummary,
  getAllCapitals,
  getCapitalByCountryCode,
  getCapitalByName,
  getCapitalSlug,
} from "./capitals.js";

// Cache allCapitals to be mindful of country REST API
let cachedAllCapitals: CapitalSummary[] | null = null;

async function getCachedAllCapitals(): Promise<CapitalSummary[]> {
  if (!cachedAllCapitals) {
    cachedAllCapitals = await getAllCapitals();
  }
  return cachedAllCapitals;
}

const server: McpServer = new McpServer(
  {
    name: "world-capitals-explorer",
    version: "0.0.1",
  },
  { capabilities: {} },
).registerWidget(
  "explore-capitals",
  {
    description: "Interactive world capitals explorer with map visualization",
    _meta: {
      ui: {
        csp: {
          resourceDomains: [
            "https://upload.wikimedia.org",
            "https://flagcdn.com",
            "blob:",
          ],
          connectDomains: ["https://*.mapbox.com"],
        },
      },
    },
  },
  {
    description:
      "Use this tool to explore world capitals. Displays an interactive map with detailed information about capital cities including population, currencies, and beautiful photos. Always use it when users ask about capitals, countries, or want to explore geography.",
    inputSchema: {
      name: z
        .string()
        .describe(
          "Capital city name in English (e.g., 'Paris', 'Tokyo', 'Washington, D.C.', 'London', 'New Delhi')",
        ),
    },
    annotations: {
      readOnlyHint: true,
      openWorldHint: true,
      destructiveHint: false,
    },
    _meta: {
      "openai/widgetAccessible": true,
    },
  },
  async ({ name }) => {
    try {
      // Fetch list first (minimal data), then details for requested capital
      const allCapitals = await getCachedAllCapitals();
      const capital = await getCapitalByName(name);

      return {
        _meta: {
          slug: getCapitalSlug(capital.name),
          allCapitals, // In meta to avoid flooding the model
        },
        structuredContent: {
          capital, // Initial capital details
        },
        content: [
          {
            type: "text",
            text: formatCapitalForModel(capital),
          },
        ],
        isError: false,
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  },
);

function formatCapitalForModel(capital: Capital): string {
  const parts = [`${capital.name} is the capital of ${capital.country.name}.`];

  if (capital.wikipedia.capitalDescription) {
    parts.push(capital.wikipedia.capitalDescription);
  }

  if (capital.wikipedia.countryDescription) {
    parts.push(
      `About ${capital.country.name}: ${capital.wikipedia.countryDescription}`,
    );
  }

  parts.push(
    `Population: ${capital.population.toLocaleString()}`,
    `Currencies: ${capital.currencies.map((c) => `${c.name} (${c.symbol})`).join(", ") || "N/A"}`,
    `Continent: ${capital.continent}`,
  );

  return parts.join("\n\n");
}

const router = Router();

router.get("/api/capital/:cca2", async (req: Request, res: Response) => {
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
    return res.json(capital);
  } catch (error) {
    return res.status(404).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

server.use(router);

server.run();

export type AppType = typeof server;
