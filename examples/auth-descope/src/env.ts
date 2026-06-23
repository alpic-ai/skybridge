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
  // MCP Server Discovery URL from the Descope console's Connection Information.
  DESCOPE_MCP_SERVER_URL: requireEnv("DESCOPE_MCP_SERVER_URL"),
};
