import "dotenv/config";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  NODE_ENV:
    (process.env.NODE_ENV as "development" | "production") || "development",
  /** Advertised authorization-server URL (`customProvider` `serverUrl`). */
  SERVER_URL: process.env.SERVER_URL || "http://localhost:3000",
  /** Descope MCP Server Discovery URL — DCR must be disabled on the MCP Server. */
  DESCOPE_MCP_SERVER_URL: requireEnv("DESCOPE_MCP_SERVER_URL"),
};
