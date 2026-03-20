import type { Spec } from "@json-render/core";
import {
  autoFixSpec,
  defineCatalog,
  formatSpecIssues,
  validateSpec,
} from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { shadcnComponentDefinitions } from "@json-render/shadcn/catalog";
import { McpServer } from "skybridge/server";

const catalog = defineCatalog(schema, {
  components: shadcnComponentDefinitions,
  actions: {},
});

const catalogPrompt = catalog.prompt();
const specSchema = catalog.zodSchema();

const server = new McpServer(
  {
    name: "generative-ui",
    version: "0.0.1",
  },
  { capabilities: {} },
).registerWidget(
  "render",
  {
    description: "Renders a json-render UI spec using shadcn/ui components",
  },
  {
    description: [
      "Render a dynamic UI from a json-render spec. The spec uses a flat format with a root element ID and an elements map.",
      "Each element has a type (component name), props, and children (array of element IDs).",
      "",
      "Available components and their props:",
      catalogPrompt,
    ].join("\n"),
    inputSchema: {
      spec: specSchema.describe("The json-render UI spec to render"),
    },
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false,
    },
  },
  async ({ spec: rawSpec }) => {
    const { spec: fixedSpec } = autoFixSpec(rawSpec as Spec);

    // Structural validation (missing root, dangling children, etc.)
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
);

server.run();

export type AppType = typeof server;
