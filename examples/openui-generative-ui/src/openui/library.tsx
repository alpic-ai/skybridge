import { createLibrary } from "@openuidev/react-lang";
import {
  openuiPromptOptions,
  openuiLibrary as standardOpenuiLibrary,
} from "@openuidev/react-ui";
import { alpicCatalogComponents } from "./alpic-catalog.js";

const alpicComponentNames = alpicCatalogComponents.map(
  (component) => component.name,
);

export const openuiLibrary = createLibrary({
  root: standardOpenuiLibrary.root ?? "Stack",
  componentGroups: [
    ...(standardOpenuiLibrary.componentGroups ?? []),
    {
      name: "Alpic",
      components: alpicComponentNames,
      notes: [
        "- Prefer Alpic catalog components for MCP app, project, and operations UIs.",
        "- Compose Alpic components with Stack, Tabs, Table, and chart primitives from the standard library.",
        "- Do not invent Page, Section, or other undeclared components; use PageHeader plus Stack.",
      ],
    },
  ],
  components: [
    ...Object.values(standardOpenuiLibrary.components),
    ...alpicCatalogComponents,
  ],
});

export const exampleOpenuiProgram: string = `root = Stack([hero, metrics, projects, insight, actions], "column", "l")
hero = PageHeader("Alpic workspace", "MCP apps hosted on Alpic, with live environments and session volume.", "Team catalog")
metrics = Stack([sessions, requests, errors], "row", "m", "stretch", "start", true)
sessions = StatCard("Sessions", "18.4k", "+12% vs last week", "up")
requests = StatCard("Requests", "241k", "+4% vs last week", "up")
errors = StatCard("Errors", "0.4%", "-0.2 pts", "down")
projects = Stack([skybridge, playground, shop], "row", "m", "stretch", "start", true)
skybridge = ProjectCard("Skybridge", "production", "live", "12.1k sessions", "ChatGPT Apps framework")
playground = ProjectCard("Playground", "staging", "deploying", "860 sessions", "Hosted MCP client")
shop = ProjectCard("Alpic Shop", "production", "live", "3.4k sessions", "Storefront MCP app")
insight = InsightCallout("Deploy health", "Production is stable. Staging is rolling out the Alpic component catalog.", "success")
actions = ActionButton("Open Alpic", "https://app.alpic.ai")`;

export const openuiPrompt: string = openuiLibrary.prompt({
  ...openuiPromptOptions,
  additionalRules: [
    ...(openuiPromptOptions.additionalRules ?? []),
    "You are generating OpenUI Lang for a Skybridge view.",
    "Prefer the Alpic catalog (PageHeader, StatCard, ProjectCard, StatusBadge, InsightCallout, ActionButton) when the UI is about Alpic, MCP apps, deploys, or analytics.",
    "Always start with root = Stack(...).",
    "Keep labels compact so rendered cards fit inside ChatGPT and MCP app iframes.",
  ],
  examples: [exampleOpenuiProgram, ...(openuiPromptOptions.examples ?? [])],
});
