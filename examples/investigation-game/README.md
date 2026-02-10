# Investigation Game Example

## What This Example Showcases

This "Murder in the Valley" investigation game demonstrates key Skybridge capabilities:

- **Interactive Widget Rendering**: A React-based widget that displays an interactive murder mystery game directly in AI conversations
- **Display Mode Switching**: Seamless transition between inline and fullscreen display modes using `useDisplayMode()` hook
- **Follow-up Messages**: Sends contextual messages to the AI when the user selects suspects to interrogate using `useSendFollowUpMessage()` hook
- **Multi-Screen Game Flow**: Demonstrates managing complex widget state with multiple game screens (start, intro, main, victory)
- **LLM Role-Playing Integration**: Server provides rich context for the AI to role-play as different suspects during interrogation

## Example Prompts

- Start a game

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm (install with `npm install -g pnpm`)
- HTTP tunnel such as [ngrok](https://ngrok.com/download)

### Local Development

#### 1. Install

```bash
pnpm install
```

#### 2. Start your local server

Run the development server from the root directory:

```bash
pnpm dev
```

This command starts an Express server on port 3000. This server packages:

- an MCP endpoint on `/mcp` (the app backend)
- a React application on Vite HMR dev server (the UI elements to be displayed in the host)

#### 3. Connect to ChatGPT

- ChatGPT requires connectors to be publicly accessible. To expose your server on the Internet, run:
```bash
ngrok http 3000
```
- In ChatGPT, navigate to **Settings → Connectors → Create** and add the forwarding URL provided by ngrok suffixed with `/mcp` (e.g. `https://3785c5ddc4b6.ngrok-free.app/mcp`)

#### 4. Test with the emulator

Open http://localhost:3000 in your browser to test your widget using the provided emulator without needing to connect to ChatGPT.

### Create your first widget

#### 1. Add a new widget

- Register a widget in `server/src/server.ts` with a unique name (e.g., `my-widget`)
- Create a matching React component at `web/src/widgets/my-widget.tsx`. The file name must match the widget name exactly

#### 2. Edit widgets with Hot Module Replacement (HMR)

Edit and save components in `web/src/widgets/` — changes appear instantly in the host

#### 3. Edit server code

Modify files in `server/src/` - the server reloads right away

## Project Structure

```
.
├── server/
│   └── src/
│       ├── server.ts       # MCP server with widget registration and game context
│       └── index.ts        # Express server definition
└── web/
    └── src/
        ├── data/           # Game data (suspects, puzzle)
        └── widgets/
            ├── murder-in-the-valley.tsx  # Main widget component
            ├── screens/    # Game screens (Start, Intro, Main, Victory)
            ├── components/ # Reusable components (DialogueBox, SuspectCard, effects)
            └── hooks/      # Custom hooks (useTypewriter)
```

## Deploy to Production

You can deploy this app to your platform of choice or just

[![Deploy it on Alpic](https://assets.alpic.ai/button.svg)](https://app.alpic.ai/new/clone?repositoryUrl=https://github.com/alpic-ai/skybridge&rootDir=examples/investigation-game)

## Resources

- [Skybridge Documentation](https://docs.skybridge.tech/home)
- [Apps SDK Documentation](https://developers.openai.com/apps-sdk)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Alpic Documentation](https://docs.alpic.ai/)
