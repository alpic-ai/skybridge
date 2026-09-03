import { intentMiddleware } from "@alpic-ai/insights";
import type { Spec } from "@json-render/core";
import {
  autoFixSpec,
  defineCatalog,
  formatSpecIssues,
  validateSpec,
} from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { shadcnComponentDefinitions } from "@json-render/shadcn/catalog";
import { Skybridge } from "skybridge/server";
import { z } from "zod";

const catalog = defineCatalog(schema, {
  components: shadcnComponentDefinitions,
  actions: {},
});

const catalogPrompt = catalog.prompt();
const specSchema = catalog.zodSchema();

export const app = new Skybridge({
  name: "mcpcn",
  version: "0.0.1",
  handler: (server) =>
    server
      .registerTool(
        {
          name: "hello-world",
          description: "A hero widget with customizable title and subtitle.",
          inputSchema: {
            title: z.string().optional().describe("The main title to display."),
            subtitle: z
              .string()
              .optional()
              .describe("The subtitle to display."),
          },
          view: {
            component: "hello-world",
            description: "Hello World widget",
            csp: {
              resourceDomains: ["https://avatars.githubusercontent.com"],
            },
          },
        },
        async ({ title, subtitle }) => {
          return {
            structuredContent: { title, subtitle },
            content: [],
            isError: false,
          };
        },
      )
      .registerTool(
        {
          name: "get-ui-catalog",
          description:
            "Returns the full mcpcn UI component catalog. Call this before render to learn available components, their props, and the spec format.",
          annotations: {
            readOnlyHint: true,
            openWorldHint: false,
            destructiveHint: false,
          },
        },
        async () => ({
          content: [{ type: "text" as const, text: catalogPrompt }],
        }),
      )
      .registerTool(
        {
          name: "render",
          description:
            "Render a dynamic UI from a json-render spec using mcpcn components. Call get-ui-catalog first to learn available components and the spec format.",
          inputSchema: {
            spec: specSchema.describe("The json-render UI spec to render"),
          },
          annotations: {
            readOnlyHint: true,
            openWorldHint: false,
            destructiveHint: false,
          },
          view: {
            component: "render",
            description: "Renders a json-render UI spec using mcpcn components",
          },
        },
        async ({ spec: rawSpec }) => {
          const { spec: fixedSpec } = autoFixSpec(rawSpec as Spec);

          const structural = validateSpec(fixedSpec);
          if (!structural.valid) {
            return {
              structuredContent: {},
              content: [
                {
                  type: "text" as const,
                  text: `Spec structural errors:\n${formatSpecIssues(structural.issues)}`,
                },
              ],
              isError: true,
            };
          }

          return {
            structuredContent: { spec: fixedSpec },
            content: [
              {
                type: "text" as const,
                text: "UI rendered successfully.",
              },
            ],
            isError: false,
          };
        },
      )
      .mcpMiddleware(intentMiddleware()),
});

export type AppType = typeof app;
