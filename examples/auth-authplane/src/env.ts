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
  /** Authplane authorization server URL. */
  AUTHPLANE_ISSUER: requireEnv("AUTHPLANE_ISSUER"),
  /**
   * Public URL of this MCP server — its resource identifier. Authplane binds
   * the token `aud` to the resource indicator the client sends, and the client
   * reads that from this server's advertised protected-resource metadata, so
   * it must be the URL clients actually reach, registered in Authplane as the
   * same string.
   */
  SERVER_URL: process.env.SERVER_URL || "http://localhost:3000/mcp",
};
