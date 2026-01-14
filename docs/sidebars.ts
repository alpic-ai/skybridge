import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  docSidebar: [
    "introduction",
    "mcp-and-chatgpt-fundamentals",
    {
      type: "category",
      label: "Quickstart",
      items: [
        "quickstart/create-new-app",
        "quickstart/test-your-app",
        {
          type: "category",
          label: "Add to Existing App",
          items: [
            "quickstart/add-to-existing-app/index",
            "quickstart/add-to-existing-app/server",
            "quickstart/add-to-existing-app/web",
          ],
        },
      ],
    },
    {
      type: "category",
      label: "Concepts",
      items: [
        "concepts/index",
        "concepts/data-flow",
        "concepts/llm-context-sync",
        "concepts/fast-iteration",
        "concepts/type-safety",
      ],
    },
    "devtools/devtools",
    {
      type: "category",
      label: "API Reference",
      items: [
        {
          type: "category",
          label: "Server",
          items: [
            "api-reference/server/mcp-server",
            "api-reference/server/register-widget",
          ],
        },
        {
          type: "category",
          label: "Hooks",
          items: [
            "api-reference/hooks/use-tool-info",
            "api-reference/hooks/use-call-tool",
            "api-reference/hooks/use-widget-state",
            "api-reference/hooks/use-layout",
            "api-reference/hooks/use-user",
            "api-reference/hooks/use-display-mode",
            "api-reference/hooks/use-request-modal",
            "api-reference/hooks/use-open-external",
            "api-reference/hooks/use-send-follow-up-message",
            "api-reference/hooks/use-files",
            "api-reference/hooks/use-apps-sdk-context",
          ],
        },
        {
          type: "category",
          label: "Utilities",
          items: [
            "api-reference/utilities/create-store",
            "api-reference/utilities/generate-helpers",
            "api-reference/utilities/data-llm",
          ],
        },
        {
          type: "category",
          label: "Types",
          items: ["api-reference/types/infer-utility-types"],
        },
      ],
    },
    "faq",
    "thanks",
  ],
};

export default sidebars;
