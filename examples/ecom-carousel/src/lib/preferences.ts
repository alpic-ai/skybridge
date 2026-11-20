import { createHash } from "node:crypto";
import type { McpExtra } from "skybridge/server";
import { z } from "zod";

export const preferenceShape = {
  size: z.enum(["", "XS", "S", "M", "L", "XL", "XXL"]),
  color: z.string().max(80),
};
export type Preferences = z.infer<z.ZodObject<typeof preferenceShape>>;
const defaults: Preferences = { size: "", color: "" };
// Demo persistence: process memory, keyed only by a validated token or a
// server-issued transport session. Client _meta is a hint, not an identity.
const preferences = new Map<string, Preferences>();

export function scopes(extra: Pick<McpExtra, "mcpReq" | "sessionId" | "http">) {
  const meta = extra.mcpReq._meta;
  const hostSession =
    typeof meta?.["openai/session"] === "string"
      ? meta["openai/session"]
      : undefined;
  const digest = (value: string) =>
    createHash("sha256").update(value).digest("hex");
  const identity = extra.http?.authInfo?.token
    ? `token:${extra.http.authInfo.token}`
    : extra.sessionId
      ? `session:${extra.sessionId}`
      : null;
  return {
    preferences: identity ? digest(identity) : null,
    form: identity
      ? digest(identity)
      : hostSession
        ? digest(`host-session:${hostSession}`)
        : null,
  };
}

export function readPreferences(scope: string | null): Preferences {
  return { ...((scope ? preferences.get(scope) : undefined) ?? defaults) };
}

export function updatePreferences(
  scope: string | null,
  set: Partial<Preferences>,
): Preferences {
  if (!scope) {
    throw new Error(
      "Settings need an authenticated user or server session to persist preferences safely.",
    );
  }
  const values = { ...readPreferences(scope), ...set };
  preferences.set(scope, values);
  return { ...values };
}
