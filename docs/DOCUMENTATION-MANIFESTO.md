# Skybridge Documentation Manifesto

Skybridge aims at providing the best developer experience to MCP Apps and ChatGPT Apps builders. We believe **great documentation** is as important as a great framework.

This manifesto is written for **all** Skybridge contributors, whether you're opening your first pull request or you're part of the core maintainers.

## General concepts

You are writing documentation for **humans and AI agents**. This means:

- **Be clear and concise, but not too concise.** Keep it simple, but still warm, readable, and enjoyable for humans.
- **Use illustrations and Mintlify components.** People spend more time in documentation that is visually clear and pleasant to read. Use callouts, cards, code examples, and well-designed sections. For diagrams, prefer Mermaid so they can be read by both humans and agents. Use Skybridge colors and styling inside Mermaid diagrams when appropriate.
- **Think about the documentation globally, not just page by page.** Structure matters as much as content. The same information may need to appear in multiple user paths such as Get Started, Guides, and API Reference. Always consider whether a change belongs in more than one place.

### Understand your reader

Most documentation visitors do not know Skybridge yet, and many do not know MCP Apps either. That means the goals of the documentation are, in order:

1. **Discovery and education:** help readers understand MCP Apps, ChatGPT Apps, and where Skybridge fits.
2. **Evaluation:** explain why Skybridge is a strong choice compared with lower-level or less integrated options.
3. **Implementation:** explain how to build with it.

If discovery and evaluation fail, readers never reach implementation.

Never assume the reader is already an expert in Skybridge or MCP Apps. When you mention non-trivial concepts, link back to the relevant Guides or Concepts pages. If a needed Guide or Concept page does not exist yet, open an issue at [alpic-ai/skybridge](https://github.com/alpic-ai/skybridge/issues/new/choose) or add the missing page in your PR.

### Always keep the documentation structure and user paths in mind

#### Current documentation structure

1. <details>
   <summary><strong>Get Started</strong>: the <strong>home and most important section of our documentation</strong>. It should explain the value of Skybridge and help readers get to a first working app in less than 5 minutes.</summary>

   - **Introduction**: why Skybridge was built, what it does, and what it does not do.
   - **Fundamentals**: what MCP Apps and ChatGPT Apps are, how they differ from traditional web apps, and how they build on MCP servers. This section should also explain how Skybridge maps to the OpenAI Apps SDK and MCP runtimes.
   - **Quickstart**: how to get started with Skybridge in under 5 minutes with our create command or the Skybridge Skill.
   - **Migrate**: how to migrate your app with the Skybridge Skill.
   - **Test your app**: how to test your app locally with DevTools or inside your target MCP client such as ChatGPT, Claude, or Cursor.
   - **Build for production**: how to build your MCP server and UI code for production use.
   - **Deploy**: how to deploy your app and publish it to MCP client stores.
   
   </details>

2. <details>
   <summary><strong>Core concepts</strong>: explains the core concepts introduced by Skybridge and MCP Apps. This section should give readers the mental models they need to understand how Skybridge works.</summary>

   - **Write Once, Run Everywhere**: how a single codebase targets both ChatGPT Apps and MCP clients such as Claude or Cursor, and how Skybridge abstracts client differences.
   - **Data Flow**: how data moves between the host, your app, and the LLM, and where state lives.
   - **LLM Context Sync**: how Skybridge keeps the model's context in sync with your app state, and when that sync runs.
   - **Fast Iteration**: the local development workflow, hot reload, and how to use DevTools to iterate without redeploying.
   - **Type Safety**: how Skybridge preserves types from your app to the client, including tools, parameters, and views, and how to get the most from TypeScript.
   
   </details>

3. <details>
   <summary><strong>Guides</strong>: step-by-step patterns for common tasks. This section should help readers implement something specific in their app.</summary>

   - **Fetching data**: loading data in your app, when to use tools vs. resources, and patterns for async data.
   - **Managing state**: app-level state, persistence, and sharing state between tools and views.
   - **Communicating with the model**: how the model invokes tools and sees resources or views, and how prompts, tool results, and context boundaries work together.
   - **Host environment context**: what the host provides, such as user, session, and locale, and how to use it in your app.
   
   </details>

4. <details>
   <summary><strong>Developer tools</strong>: how to build and debug Skybridge apps. This section should help readers develop faster and understand the tooling around Skybridge.</summary>

   - **Skills**: using the Skybridge Skill and similar workflows to scaffold, migrate, and maintain apps from your IDE or chat.
   - **Local DevTools**: running and debugging your app locally, testing tools and views, and connecting to MCP clients.
   
   </details>

5. <details>
   <summary><strong>Resources</strong>: supporting material such as FAQs, troubleshooting information, and policy or operational pages.</summary>

   - **FAQ**: common questions and troubleshooting tips from Skybridge users. This section should be updated whenever the same issue appears repeatedly in GitHub issues, discussions, or support channels.
   - **Telemetry**: what telemetry data we collect, why we collect it, and how to opt out.
   
   </details>

6. <details>
   <summary><strong>API Reference</strong>: full Skybridge API reference. This section should optimize for precision, completeness, and consistency over narrative explanation.</summary>

   - **Overview**: the entry point and how the API is organized, including server vs. web and hooks vs. utilities.
   - **CLI**: Skybridge CLI commands such as create, build, and dev, plus their options.
   - **Server**: server-side APIs for defining the MCP server and registering UI.
     - **McpServer**: the server class, tools, resources, and type export.
     - **registerTool**: registers a tool — optionally with a `view` config that binds the tool to a React view (component name, CSP, description).
   - **Hooks**: React hooks for view UIs, including data, layout, and actions.
     - **useToolInfo, useCallTool**: initial tool data and calling tools from the view.
     - **useLayout, useUser, useDisplayMode**: host layout, user or session, and display mode.
     - **useOpenExternal, useSetOpenInAppUrl**: opening URLs and in-app links.
     - **useSendFollowUpMessage**: sending follow-up messages to the conversation.
     - **useWidgetState**: persistent view state across renders.
     - **useRequestModal**: opening the view in a modal.
     - **useFiles**: file upload and download.
   - **Utilities**: helpers and attributes.
     - **createStore**: Zustand-based store creation for shared state.
     - **generateHelpers**: typed `useCallTool` and `useToolInfo` helpers generated from server types.
     - **data-llm**: an attribute for exposing DOM content to the model.
   - **Types**: `infer-utility-types` and other helpers for server-to-client type inference.
   - **Advanced**: low-level context hooks such as `useAppsSdkContext` and `useMcpAppContext` when you need raw host APIs.
   
   </details>

7. **Showcase**: apps built with Skybridge. This section should include example apps in the Skybridge repository and third-party apps built with the framework. Examples should be organized into sub-sections such as Basic, Auth, Third-party integrations, and similar categories.

#### User paths, in order of importance

1. A new user who wants to understand what Skybridge is: Get Started, then Core concepts.
2. A new user who wants to try Skybridge quickly: Quickstart.
3. A user who is actively building: Guides, Core concepts, and API Reference.
4. A returning user who needs exact implementation details: API Reference and the relevant Guide or Concept page.

## How to contribute in practice

Because this guide is public, contributors should optimize for clarity, accuracy, and traceability. When a product change affects the docs, update the docs in the same PR whenever reasonably possible. If you cannot, open a follow-up issue and link it from the PR so the gap is visible.

Use this checklist when your PR changes product behavior, APIs, examples, terminology, or developer workflows:

- [ ] Check whether the change affects existing docs pages:
  - API Reference
  - Quickstart instructions
  - Test, build, or deploy pages
  - Concepts or Guides
  - DevTools
  - FAQ
- [ ] If the answer is yes, update those pages in the same PR.
- [ ] If the documentation work cannot be done in the same PR, open a follow-up issue at [alpic-ai/skybridge issues](https://github.com/alpic-ai/skybridge/issues/new/choose) and link it from the PR description.
- [ ] If the change introduces a new repeated pattern, mental model, or tradeoff, decide whether it needs a new Guide or Concept page.
- [ ] If a page would be easier to understand with a screenshot, diagram, or Mintlify component, add it.
- [ ] If you changed paths, filenames, or navigation, verify that the information architecture still makes sense and run `mint broken-links`.
- [ ] If you changed navigation, layout, or Mintlify components, preview the affected pages locally before merging.

## Detailed guidelines (especially useful for LLMs)

### Style and tone (Skybridge voice)

- **Person:** Use **you/your** for the reader in instructions and explanations. Use **we/our** when speaking as the team or about the product, for example "We built Skybridge", "our starter template", or "we collect".
- **Tone:** Confident and approachable. Use short, direct sentences; contractions are fine, such as "you'll", "it's", and "don't". A little warmth is fine, but avoid slang and colloquialisms.
- **Clarity first:** Use simple language. Avoid jargon and clever phrasing. Readers are here to get something done, so be concise and skimmable.
- **Active voice:** Prefer "Create a config file" over "A config file should be created."
- **Skimmable structure:** Use clear headings, short paragraphs, and one main idea per paragraph when possible. Use bullet lists, numbered lists, and tables for comparisons or reference, for example `Pattern | Hook | When to use`.

### Structure and formatting

- **Frontmatter:** Every page should have `title` and `description`. Add `icon` only when it improves recognition, for example on quickstart pages. Use sentence case for titles.
- **Headings:** Use sentence case, for example "Install the skill", "What we collect", and "Next steps". You can use title-style headings for nav-like sections such as "Get Started" or "Learn More". Do not skip levels.
- **Related section:** Every page should end with a `Related` section that points readers to the most relevant next pages, so they can keep navigating naturally through the documentation.
- **Code and commands:** Use `<CodeGroup>` when showing the same command for multiple package managers such as npm, pnpm, yarn, bun, or deno. Use fenced code blocks with a language hint. Use inline code formatting for API names, filenames, and commands.
- **Callouts:** Use `<Tip>` for optional context or beginner guidance; `<Info>` for prerequisites or important context; `<Warning>` for gotchas; and `<Note>` for deeper external reading. Use `<Card>` and `<CardGroup>` for next steps and navigation. Keep callout body copy lean.
- **Mintlify component references:** Use [Mintlify llms.txt](https://www.mintlify.com/docs/llms.txt) and [Mintlify components](https://www.mintlify.com/docs/components/index.md) when you need ideas or syntax for supported components.

### Links and references

- **Internal links:** Use paths like `/devtools/skills` and `/fundamentals`. Link once per destination per page where it is most useful. Avoid repeating the same link many times on one page.
- **Link text:** Use descriptive text such as "Skill" or "Fundamentals" instead of "click here" or "this page".
- **External links:** Use external links for official references such as the OpenAI Apps SDK, MCP repositories, or Alpic. Keep essential context on the page and use external links for deeper reading.

### Terminology and consistency

- **Product and types:** Capitalize "App" when referring to the type, for example ChatGPT App, MCP App, or AI App. Use "your app" in body text. Use consistent product names: Skybridge, Skill, DevTools, MCP.
- **User-centric language:** Orient sentences around what the reader is doing or needs. Use internal or team jargon only when it is part of the product vocabulary.

### What to avoid

- Spelling and grammar errors.
- Obvious steps such as "Click Save to save".
- Slang and colloquialisms.
- Product-centric or internal jargon that readers would not know.

### References

For deeper style guidance, see [Mintlify: Style and tone](https://mintlify.com/guides/writing-style-tips), [Google Developer Documentation Style Guide](https://developers.google.com/style), and [Microsoft Writing Style Guide](https://learn.microsoft.com/en-us/style-guide/welcome/).
