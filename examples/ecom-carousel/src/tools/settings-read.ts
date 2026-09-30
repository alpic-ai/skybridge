import type { McpExtra } from "skybridge/server";
import { z } from "zod";
import {
  preferenceShape,
  readPreferences,
  scopes,
} from "../lib/preferences.js";

const appOnly = { ui: { visibility: ["app" as const] } };
const readOnly = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
};

export const settingsReadDefinition = {
  name: "settings-read" as const,
  inputSchema: {},
  annotations: readOnly,
  _meta: appOnly,
  description:
    "Read effective size and colour preferences for this host subject/session.",
  outputSchema: {
    schema: z.object({
      type: z.literal("object"),
      additionalProperties: z.boolean(),
      properties: z.object({
        size: z.object({
          type: z.literal("string"),
          title: z.string(),
          enum: z.array(z.string()),
          description: z.string(),
        }),
        color: z.object({
          type: z.literal("string"),
          title: z.string(),
          maxLength: z.number(),
          description: z.string(),
        }),
      }),
      required: z.array(z.string()),
    }),
    layout: z.array(
      z.object({
        kind: z.literal("group"),
        title: z.string(),
        items: z.array(
          z.object({
            kind: z.literal("property"),
            property: z.enum(["size", "color"]),
          }),
        ),
      }),
    ),
    values: z.strictObject(preferenceShape),
  },
};
export function settingsReadHandler(
  _input: Record<string, never>,
  extra: McpExtra,
) {
  return {
    content: [],
    structuredContent: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          size: {
            type: "string",
            title: "Preferred apparel size",
            enum: ["", "XS", "S", "M", "L", "XL", "XXL"],
            description:
              "Blank means no preference. Used only when a matching variant exists.",
          },
          color: {
            type: "string",
            title: "Preferred colour",
            maxLength: 80,
            description: "Used only when a matching variant exists.",
          },
        },
        required: ["size", "color"],
      },
      layout: [
        {
          kind: "group",
          title: "Shopping preferences",
          items: [
            { kind: "property", property: "size" },
            { kind: "property", property: "color" },
          ],
        },
      ],
      values: readPreferences(scopes(extra).preferences),
    },
  };
}
