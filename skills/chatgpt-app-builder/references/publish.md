# Publish to Directories

## 1. Audit Annotations

**Common cause of rejection.** Ensure all tools and views have correct annotations. See [fetch-and-render-data.md](fetch-and-render-data.md).

## 2. Audit CSP

Ensure all external domains are declared in the tool's `view.csp`. See [csp.md](csp.md).

## 3. Submit

### ChatGPT
Guide user to submit the plugin at the [plugin submission portal](https://platform.openai.com/plugins).

OpenAI verifies domain ownership via `/.well-known/openai-apps-challenge` (the well-known path keeps its legacy name). Guide user to Alpic **Distribution** tab → **OpenAI Apps Verification Token** → paste the token from OpenAI.

See OpenAI's [plugin guidelines](https://developers.openai.com/plugins/app-guidelines) and [MCP server review requirements](https://developers.openai.com/plugins/deploy/app-review) before submitting.

### Claude
Guide user to submit the connector on the [Anthropic Connectors Directory FAQ](https://support.claude.com/en/articles/11596036-anthropic-connectors-directory-faq).

### Gemini and Google Search
Google's Connected Apps Platform is in preview: guide user to request access through the [application form](https://connected.google.com/console/help/?apply), then register, test, and submit the server in the [Google Connected Console](https://developers.google.com/connected-apps/gpc). They pick Search, the Gemini app, or both before review. See `docs/resources/gemini.mdx` and Google's [UI guidelines](https://developers.google.com/connected-apps/mcp/guidelines).
