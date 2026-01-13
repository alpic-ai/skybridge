import { McpServer } from "skybridge/server";
import * as z from "zod";
import {
  type Capital,
  type CapitalSummary,
  getAllCapitals,
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

const server = new McpServer(
  {
    name: "world-capitals-explorer",
    version: "0.0.1",
  },
  { capabilities: {} },
).registerWidget(
  "capital",
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
    hosts: ["apps-sdk"],
  },
  {
    description:
      "Use this tool to explore world capitals. Displays an interactive map with detailed information about capital cities including population, currencies, and beautiful photos. Always use it when users ask about capitals, countries, or want to explore geography.",
    inputSchema: {
      name: z
        .string()
        .describe(
          "Capital city name in English (e.g., 'Paris', 'Tokyo', 'Washington')",
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

export default server;
export type AppType = typeof server;
