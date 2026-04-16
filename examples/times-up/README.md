# Time's Up Example

An example MCP app built with [Skybridge](https://docs.skybridge.tech/home): a word-guessing party game where the user sees a secret word and gives hints to the AI, which tries to guess it.

## What This Example Showcases

- **Widget + Tool Combo**: A `play` widget for the game UI and a separate `guess` tool for AI guesses, demonstrating how widgets and tools work together
- **Hidden Metadata (`_meta`)**: The secret word is passed via `_meta` so only the widget (and the human player) can see it — the AI only receives the card ID
- **PiP Display Mode**: Switches to picture-in-picture via `useDisplayMode()` when the game starts, so the card stays visible while chatting
- **Tool Calling from Widgets**: The "Draw another card" button calls the `play` tool from within the widget using `useCallTool()`
- **Follow-Up Messages**: Notifies the AI of newly drawn cards via `useSendFollowUpMessage()`
- **User Locale**: Adapts the displayed word and UI strings to the user's language via `useUser()` and `react-intl` (supports EN, FR, ES, IT, PT)
- **CSP Configuration**: Allows loading twemoji SVG illustrations from external CDNs via `resourceDomains`
- **OpenAI Apps SDK UI**: Uses `Badge`, `Button`, and `LoadingIndicator` components from `@openai/apps-sdk-ui`

## Live Demo

[Try it in Alpic's Playground](https://times-up.skybridge.tech/try) to launch the live widget experience, or use the MCP URL with your client of choice: `https://times-up.skybridge.tech/mcp`.

## Getting Started

### Prerequisites

- Node.js 24+

### Local Development

#### 1. Install

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

#### 2. Start your local server

Run the development server from the root directory:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

This command starts:

- Your MCP server at `http://localhost:3000/mcp`.
- Skybridge DevTools UI at `http://localhost:3000/`.

#### 3. Project structure

```
├── server/
│   └── src/
│       ├── index.ts      # Server entry point (play widget + guess tool)
│       ├── cards.ts       # Card draw/lookup helpers
│       └── cards.json     # 100 multilingual cards with twemoji illustrations
├── web/
│   ├── src/
│   │   ├── widgets/
│   │   │   ├── play.tsx          # Game widget (card display, blur reveal, draw)
│   │   │   └── locales/          # i18n strings (en, fr, es, it, pt)
│   │   ├── helpers.ts    # Shared utilities
│   │   └── index.css     # Global styles (Tailwind + OpenAI UI)
│   └── vite.config.ts
├── alpic.json            # Deployment config
└── package.json
```

### Create your first widget

#### 1. Add a new widget

- Register a widget in `server/src/index.ts` with a unique name (e.g., `my-widget`) using [`registerWidget`](https://docs.skybridge.tech/api-reference/register-widget)
- Create a matching React component at `web/src/widgets/my-widget.tsx`. **The file name must match the widget name exactly**.

#### 2. Edit widgets with Hot Module Replacement (HMR)

Edit and save components in `web/src/widgets/` — changes will appear instantly inside your App.

#### 3. Edit server code

Modify files in `server/` and refresh the connection with your testing MCP Client to see the changes.

### Testing your App

You can test your App locally by using our DevTools UI on `http://localhost:3000` while running the dev command.

To test your app with other MCP Clients like ChatGPT, Claude or VSCode, see [Testing Your App](https://docs.skybridge.tech/quickstart/test-your-app).

## Deploy to Production

Skybridge is infrastructure vendor agnostic, and your app can be deployed on any cloud platform supporting MCP.

The simplest way to deploy your App in minutes is [Alpic](https://alpic.ai/).

1. Create an account on [Alpic platform](https://app.alpic.ai/).
2. Connect your GitHub repository to automatically deploy at each commit.
3. Use your remote App URL to connect it to MCP Clients, or use the Alpic Playground to easily test your App.

## Resources

- [Skybridge Documentation](https://docs.skybridge.tech/)
- [Apps SDK Documentation](https://developers.openai.com/apps-sdk)
- [MCP Apps Documentation](https://github.com/modelcontextprotocol/ext-apps/tree/main)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Alpic Documentation](https://docs.alpic.ai/)
