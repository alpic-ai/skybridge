# Zip Files Example

An example MCP app built with [Skybridge](https://docs.skybridge.tech/home): compress a file into a downloadable `.zip` archive directly from the conversation.

## What This Example Showcases

- **FileRef Input**: Accepts a `FileRef` with `openai/fileParams` so ChatGPT can route file attachments to the tool
- **ChatGPT File Picking**: Picks files from device upload or the ChatGPT library via [`useFiles()`](https://docs.skybridge.tech/api-reference/use-files) (`upload`, `selectFiles`, `getDownloadUrl`)
- **Widget-Accessible Tool**: The widget calls the `zip-file` tool directly via [`useCallTool()`](https://docs.skybridge.tech/api-reference/use-call-tool) with `_meta["openai/widgetAccessible"]`
- **Server-side ZIP Creation**: Builds ZIP archives with Node.js `zlib` (`deflateRawSync`) and a hand-written ZIP container — no external archive library
- **Cloudflare R2 Storage**: Uploads generated archives to R2 and returns presigned download URLs (required — the server won't start without R2 credentials)
- **External Download**: Opens the archive download URL via [`useOpenExternal()`](https://docs.skybridge.tech/api-reference/use-open-external)
- **Structured Content**: Returns the archive `FileRef` plus original and compressed byte sizes
- **Hot Module Replacement**: [Live reloading](https://docs.skybridge.tech/concepts/fast-iteration#hmr-with-vite-plugin) of widget components during development
- **Local DevTools**: [DevTools](https://docs.skybridge.tech/devtools) at `http://localhost:3000` for local testing

## Example Prompts

- Zip this file for me
- Compress the attachment into a downloadable archive

## Getting Started

### Prerequisites

- Node.js 24+
- A [Cloudflare R2](https://developers.cloudflare.com/r2/) bucket and API token

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

#### 2. Configure Cloudflare R2

```bash
cp .env.example .env
```

Open `.env` and fill in your R2 credentials. See `.env.example` for the required variables:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`

Optionally set `R2_URL_TTL` (presigned download URL lifetime in seconds, default `900`).

#### 3. Start your local server

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

#### 4. Project structure

```
│   ├── server.ts      # Server entry point (zip-file tool)
│   ├── zip.ts         # ZIP builder (zlib + hand-written container)
│   ├── r2.ts          # Cloudflare R2 SigV4 upload & presigned URLs
│   ├── storage.ts     # Archive upload orchestration
│   └── env.ts         # .env loader
│   ├── src/
│   │   ├── views/
│   │   │   └── zip-file.tsx
│   │   ├── helpers.ts    # Shared utilities
│   │   └── index.css     # Global styles
│   └── vite.config.ts
├── .env.example          # R2 credentials template
├── alpic.json            # Deployment config
└── package.json
```

### Create your first widget

#### 1. Add a new widget

- Register a widget in `src/server.ts` with a unique name (e.g., `my-widget`) using [`registerTool`](https://docs.skybridge.tech/api-reference/register-tool)
- Create a matching React component at `src/views/my-widget.tsx`. **The file name must match the widget name exactly**.

#### 2. Edit widgets with Hot Module Replacement (HMR)

Edit and save components in `src/views/` — changes will appear instantly inside your App.

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
3. Set the R2 environment variables in your Alpic project settings.
4. Use your remote App URL to connect it to MCP Clients, or use the Alpic Playground to easily test your App.

[![Deploy it on Alpic](https://assets.alpic.ai/button.svg)](https://app.alpic.ai/new/clone?repositoryUrl=https://github.com/alpic-ai/skybridge&rootDir=examples/zip)

## Resources

- [Skybridge Documentation](https://docs.skybridge.tech/)
- [Apps SDK Documentation](https://developers.openai.com/apps-sdk)
- [MCP Apps Documentation](https://github.com/modelcontextprotocol/ext-apps/tree/main)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Alpic Documentation](https://docs.alpic.ai/)
