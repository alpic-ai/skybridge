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
  STYTCH_PROJECT_ID: requireEnv("STYTCH_PROJECT_ID"),
  STYTCH_DOMAIN: (() => {
    const value = requireEnv("STYTCH_DOMAIN");
    try {
      new URL(value);
    } catch {
      throw new Error(
        `STYTCH_DOMAIN must be a valid URL (e.g. https://<project-id>.stytch.com), got: "${value}"`,
      );
    }
    return value;
  })(),
};
