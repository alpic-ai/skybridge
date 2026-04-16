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
  SERVER_URL: process.env.SERVER_URL || "http://localhost:3000",
  AUTHKIT_DOMAIN: requireEnv("AUTHKIT_DOMAIN"),
  WORKOS_API_KEY: requireEnv("WORKOS_API_KEY"),
};
