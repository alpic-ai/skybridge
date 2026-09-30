import { createHash } from "node:crypto";
import type { McpExtra } from "skybridge/server";
import { z } from "zod";

export const preferenceShape = {
  size: z.enum(["", "XS", "S", "M", "L", "XL", "XXL"]),
  color: z.string().max(80),
};
export type Preferences = z.infer<z.ZodObject<typeof preferenceShape>>;
const defaults: Preferences = { size: "", color: "" };
// Demo persistence: process memory, isolated by host subject or session.
const preferences = new Map<string, Preferences>();

export function scopes(extra: Pick<McpExtra, "mcpReq" | "sessionId">) {
  const meta = extra.mcpReq._meta;
  const subject =
    typeof meta?.["openai/subject"] === "string"
      ? meta["openai/subject"]
      : undefined;
  const session =
    typeof meta?.["openai/session"] === "string"
      ? meta["openai/session"]
      : extra.sessionId;
  const digest = (value: string) =>
    createHash("sha256").update(value).digest("hex");
  return {
    preferences: subject
      ? digest(`subject:${subject}`)
      : session
        ? digest(`session:${session}`)
        : null,
    form: session ? digest(JSON.stringify([subject ?? "", session])) : null,
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
      "Settings need a host subject or session to persist preferences safely.",
    );
  }
  const values = { ...readPreferences(scope), ...set };
  preferences.set(scope, values);
  return { ...values };
}
