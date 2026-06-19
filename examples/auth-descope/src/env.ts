import "dotenv/config";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const port = process.env.__PORT ?? "3000";
const DESCOPE_PROJECT_ID = requireEnv("DESCOPE_PROJECT_ID");
const DESCOPE_MCP_SERVER_ID = requireEnv("DESCOPE_MCP_SERVER_ID");
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${port}`;

export const env = {
  NODE_ENV:
    (process.env.NODE_ENV as "development" | "production") || "development",
  SERVER_URL: process.env.SERVER_URL || `http://localhost:${port}`,
  MCP_AUDIENCE: process.env.MCP_AUDIENCE || `${SERVER_URL}/mcp`,
  DESCOPE_PROJECT_ID: DESCOPE_PROJECT_ID,
  DESCOPE_MCP_SERVER_ID: DESCOPE_MCP_SERVER_ID,
  DESCOPE_MCP_SERVER_ISSUER_URL: `https://api.descope.com/v1/apps/agentic/${DESCOPE_PROJECT_ID}/${DESCOPE_MCP_SERVER_ID}`,
};