# Auth Example — Authplane

An example MCP app built with [Skybridge](https://docs.skybridge.tech/home): a personalized coffee shop finder demonstrating full OAuth authentication with [Authplane](https://authplane.ai).

## What This Example Showcases

- **Transport-Level Auth**: Auth is enforced at the `/mcp` transport level — unauthenticated requests receive HTTP 401 before reaching any tool handler
- **Authplane OAuth**: One-line setup with `authplaneProvider`, which discovers the authorization server's OAuth metadata and verifies JWTs against its JWKS
- **Native Dynamic Client Registration**: Clients register directly with Authplane, so no registration proxy is needed and this server stays out of the authorization path
- **One resource identifier**: Authplane binds the token `aud` to the RFC 8707 resource indicator, so `resource` is both the advertised resource and the expected audience — no second value to keep in sync
- **Branded provider via `oauth:`**: Passing `oauth: await authplaneProvider(...)` auto-mounts the well-known metadata endpoints and Bearer verification — no manual router
- **Personalized Results**: Favorites are highlighted and sorted first, keyed off the `sub` claim of the verified token
- **User Identity in Widgets**: The signed-in user's identity reaches the widget through `extra.authInfo`
- **Simplified Server Setup**: Uses [`app.run()`](https://docs.skybridge.tech/api-reference/run) and `.use()` for a single-file server with no manual Express boilerplate
- **Structured Content & Metadata**: Server passes structured data to widgets via `structuredContent`
- **Hot Module Replacement**: [Live reloading](https://docs.skybridge.tech/concepts/fast-iteration#hmr-with-vite-plugin) of widget components during development
- **Local DevTools**: [DevTools](https://docs.skybridge.tech/devtools) at `http://localhost:3000` for local testing

## Getting Started

### Prerequisites

- Node.js 24+
- An Authplane authorization server reachable from this app

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

#### 2. Configure Authplane

1. Point `AUTHPLANE_ISSUER` at your authorization server. Its discovery document is read from `/.well-known/openid-configuration`, falling back to `/.well-known/oauth-authorization-server`.
2. Register this MCP server as a protected resource, using the same URL you set as `SERVER_URL`, character for character.
3. Create a `.env` file in the project root:

```env
AUTHPLANE_ISSUER=https://auth.example.com
SERVER_URL=http://localhost:3000/mcp
```

> **`SERVER_URL` must be the URL clients actually reach**, and must be registered in Authplane as the resource, character for character. Authplane mints the token `aud` from the resource indicator the client sends, and the client takes that from this server's advertised protected-resource metadata. OAuth identifiers are compared exactly, so a value differing by a trailing slash or host case is a different resource and the authorization request fails with `invalid_target`.
>
> `authplaneProvider` advertises `SERVER_URL` exactly as given and uses it as the expected audience, so the two cannot disagree.
>
> **Bare origins are advertised with a root path.** The advertised resource is the URL-normalised form, so `https://example.com` is advertised as `https://example.com/`. The provider asks for the advertised form at startup and names it if the two differ — so if your resource is a bare origin, register it in Authplane **with** the trailing slash. A path such as `/mcp` is unchanged by normalisation, which is why this example uses one.
>
> If the resource is configured in Authplane with an explicit audience override, pass that value as `audience` rather than relying on the default.

> **No Authplane deployment yet?** Authplane can also be self-hosted, including locally in Docker for
> development — see the [Authplane documentation](https://authplane.ai) for setup.

#### 3. Start your local server

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
├── src/
│   ├── server.ts        # Skybridge app: authplaneProvider auth + widget
│   ├── env.ts          # Env validation
│   └── coffee-data.ts  # Mock coffee shop data & search
│   ├── views/
│   │   └── search-coffee-paris.tsx  # Coffee shop widget
│   ├── helpers.ts      # Type-safe Skybridge hooks
│   └── index.css       # Parisian theme styles
├── nodemon.json            # Dev server config
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

> Set `SERVER_URL` to your deployed URL and register that same URL as the protected resource in Authplane. Leaving it at the local default will make every token fail verification once deployed.

The simplest way to deploy your App in minutes is [Alpic](https://alpic.ai/).

1. Create an account on [Alpic platform](https://app.alpic.ai/).
2. Connect your GitHub repository to automatically deploy at each commit.
3. Use your remote App URL to connect it to MCP Clients, or use the Alpic Playground to easily test your App.

[![Deploy it on Alpic](https://assets.alpic.ai/button.svg)](https://app.alpic.ai/new/clone?repositoryUrl=https://github.com/alpic-ai/skybridge&rootDir=examples/auth-authplane)

## Resources

- [Skybridge Documentation](https://docs.skybridge.tech/)
- [Authplane Documentation](https://authplane.ai)
- [Apps SDK Documentation](https://developers.openai.com/apps-sdk)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Alpic Documentation](https://docs.alpic.ai/)
