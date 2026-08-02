import { intentMiddleware } from "@alpic-ai/insights";
import { McpServer } from "skybridge/server";
import * as z from "zod";
import { YouComSearchClient, type YouComSearchOptions } from "./youcom-client.js";

const client = new YouComSearchClient();

const server = new McpServer(
  {
    name: "youcom-web-search",
    version: "0.0.1",
  },
  { capabilities: {} },
)
  .mcpMiddleware(intentMiddleware())
  .registerTool(
    {
      name: "youcom-search",
      description:
        "Search the web using You.com for current information, news, and research. Returns structured results with titles, URLs, snippets, and source information. Supports both keyless operation (100 free searches/day) and authenticated mode with higher quotas when YDC_API_KEY is provided.",
      inputSchema: {
        query: z
          .string()
          .min(1)
          .describe("Search query to find information on the web"),
        count: z
          .number()
          .min(1)
          .max(20)
          .optional()
          .default(10)
          .describe("Number of search results to return (1-20, default: 10)"),
        domains: z
          .array(z.string())
          .optional()
          .describe("Limit search to specific domains (e.g., ['github.com', 'stackoverflow.com'])"),
        freshness: z
          .enum(["hour", "day", "week", "month", "year"])
          .optional()
          .describe("Filter by content freshness (hour, day, week, month, year)"),
        safeSearch: z
          .boolean()
          .optional()
          .default(true)
          .describe("Enable safe search filtering (default: true)"),
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: true,
        destructiveHint: false,
      },
      view: {
        component: "youcom-search-results",
        description: "You.com web search results with rich formatting",
        csp: {
          resourceDomains: [
            "https://via.placeholder.com",
            "https://www.google.com/s2/favicons",
          ],
        },
      },
      _meta: {
        "openai/widgetAccessible": true,
      },
    },
    async ({ query, count = 10, domains, freshness, safeSearch = true }) => {
      try {
        const searchOptions: YouComSearchOptions = {
          query,
          count,
          domains,
          freshness,
          safeSearch,
        };

        const searchResponse = await client.search(searchOptions);
        const allResults = [
          ...(searchResponse.results.web || []),
          ...(searchResponse.results.news || []),
        ];

        return {
          _meta: {
            searchMeta: searchResponse.searchMeta,
            resultCount: allResults.length,
            keylessMode: !client.apiKey,
          },
          structuredContent: {
            query: searchResponse.query,
            results: allResults,
            searchOptions,
          },
          content: [
            {
              type: "text",
              text: formatResultsForModel(searchResponse, allResults),
            },
          ],
          isError: false,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Search failed";
        
        return {
          _meta: {
            error: message,
            keylessMode: !client.apiKey,
          },
          structuredContent: {
            error: message,
            query,
          },
          content: [
            {
              type: "text", 
              text: `Search failed: ${message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

function formatResultsForModel(searchResponse: any, results: any[]): string {
  const parts = [
    `Found ${results.length} results for "${searchResponse.query}":`,
  ];

  results.forEach((result, index) => {
    parts.push(
      `${index + 1}. ${result.title}`,
      `   URL: ${result.url}`,
      `   ${result.snippet}`,
      `   Source: ${result.domain || "Unknown"}`,
      ""
    );
  });

  if (results.length === 0) {
    parts.push("No results found. Try a different search query.");
  }

  return parts.join("\n");
}

export default await server.run();
export type AppType = typeof server;
