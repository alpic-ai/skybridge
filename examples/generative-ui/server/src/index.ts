import {
  type Spec,
  autoFixSpec,
  defineCatalog,
  formatSpecIssues,
  validateSpec,
} from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { shadcnComponentDefinitions } from "@json-render/shadcn/catalog";
import { McpServer } from "skybridge/server";
import { z } from "zod";

const catalog = defineCatalog(schema, {
  components: shadcnComponentDefinitions,
  actions: {},
});

const catalogPrompt = catalog.prompt();

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
      root: z.string().describe("ID of the root element"),
      elements: z
        .record(
          z.string(),
          z.object({
            type: z.string().describe("Component type from the catalog"),
            props: z.record(z.string(), z.any()).describe("Component props"),
            children: z
              .array(z.string())
              .describe("Ordered list of child element IDs"),
          }),
        )
        .describe("Map of element IDs to element definitions"),
    },
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false,
    },
  },
  async ({ root, elements }) => {
    const rawSpec = { root, elements };

    // Validate against the catalog (component types, props, structure)
    const catalogResult = catalog.validate(rawSpec);
    if (!catalogResult.success || !catalogResult.data) {
      const issues = catalogResult.error?.issues ?? [];
      return {
        structuredContent: {},
        content: [
          {
            type: "text" as const,
            text: `Invalid spec: ${issues.map((i) => i.message).join("; ")}`,
          },
        ],
        isError: true,
      };
    }

    // Auto-fix common LLM mistakes (visible/on/repeat inside props)
    const { spec: fixedSpec } = autoFixSpec(catalogResult.data as Spec);

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
