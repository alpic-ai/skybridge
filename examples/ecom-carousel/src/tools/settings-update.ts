import type { McpExtra } from "skybridge/server";
import { z } from "zod";
import {
  preferenceShape,
  scopes,
  updatePreferences,
} from "../lib/preferences.js";

const appOnly = { ui: { visibility: ["app" as const] } };

const settingsSetSchema = z
  .strictObject(preferenceShape)
  .partial()
  .refine((set) => Object.keys(set).length > 0, "Set at least one preference.")
  .meta({ minProperties: 1 });
export const settingsUpdateDefinition = {
  name: "settings-update" as const,
  inputSchema: { set: settingsSetSchema },
  _meta: appOnly,
  description:
    "Update supplied preferences, preserving omitted values. Demo storage lasts until server restart.",
  outputSchema: { values: z.strictObject(preferenceShape) },
};
export function settingsUpdateHandler(
  { set }: { set: z.infer<typeof settingsSetSchema> },
  extra: McpExtra,
) {
  return {
    content: [],
    structuredContent: {
      values: updatePreferences(scopes(extra).preferences, set),
    },
  };
}
