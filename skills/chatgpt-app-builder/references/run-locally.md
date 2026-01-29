# Running Locally Workflow

## 1. Start Dev Server

Install dependencies and start the dev server in the background:

```bash
{pm} install && {pm} run dev
```

For Deno projects, use `deno task dev` instead.

When started, output the local MCP server and devtools URL.

Hot reload enabled (nodemon for server, HMR for widgets).

## 2. Connect to ChatGPT (Optional)

Ask user if they want to test in ChatGPT or just use local devtools.

If connecting to ChatGPT, expose the local server via ngrok:

```bash
ngrok http 3000
```

Extract the forwarding URL from ngrok output (e.g., `https://abc123.ngrok.io`).

Provide the user with these instructions to create the app in ChatGPT:
   - Go to **Settings → Apps → Advanced Settings → Create App**
   - Enter a name and description for the app
   - Paste this URL: `{ngrok-url}/mcp`
   - Set the appropriate Authentication scheme. In doubt, pick "No Authentication"
   - Click Create
   - Test by typing `@{app-name}` in a ChatGPT chat

## Troubleshooting

If the user reports issues:

### 'Create App' button missing
- Ask them to enable Developer mode in Settings → Apps → Advanced Settings

### 'Create App' button not working
- Confirm they have ChatGPT Plus, Pro, Business, or Enterprise/Edu plan
