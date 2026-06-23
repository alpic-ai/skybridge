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
  // Clerk Frontend API URL, e.g. `acme.clerk.accounts.dev` or a prod custom domain.
  CLERK_DOMAIN: requireEnv("CLERK_DOMAIN"),
};
