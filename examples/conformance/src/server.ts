import { McpServer, text } from "skybridge/server";
import { z } from "zod";

/**
 * Skybridge Conformance server.
 *
 * The single rendered view (`conformance`) walks a stepper of hook checks
 * against whatever host renders it. One tool covers everything: it renders the
 * view, its result carries a known marker in `structuredContent` and a secret
 * in `_meta` (asserted by the `useToolInfo` check), and it is widget-accessible
 * so the `useCallTool` check can call it from the view and read the echoed
 * `label` back.
 */
const server = new McpServer(
  {
    name: "skybridge-conformance",
    version: "0.0.1",
  },
  { capabilities: {} },
).registerTool(
  {
    name: "conformance",
    title: "Skybridge Conformance",
    description:
      "Render the Skybridge hooks conformance runner. It steps through every web hook and reports whether the current host supports it.",
    inputSchema: {
      label: z
        .string()
        .optional()
        .describe(
          "Optional label (any short string). Echoed back in the result.",
        ),
    },
    _meta: { "openai/widgetAccessible": true },
    view: {
      component: "conformance",
      description:
        "A stepper that exercises every Skybridge web hook on the current host and fills a copyable results table.",
      // Allowlist the openExternal target so it skips safe-link modals.
      csp: {
        redirectDomains: ["https://docs.skybridge.tech"],
      },
    },
  },
  async ({ label }) => {
    const structuredContent = {
      marker: "structured-content-visible-to-model-and-view",
      label: label ?? null,
    };
    return {
      structuredContent,
      content: [text(JSON.stringify(structuredContent))],
      isError: false,
      // The useToolInfo check asserts this reaches the view via
      // responseMetadata (and never leaks to the model).
      _meta: { secret: "meta-is-view-only" },
    };
  },
);

export default await server.run();
