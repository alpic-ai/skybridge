# Running Locally Workflow

## 1. Start Dev Server

Install dependencies and start the dev server in the background:

```bash
{pm} install && {pm} run dev
```

For Deno projects, use `deno task dev` instead.

When started, output the local MCP server and devtools URL.

Hot reload enabled (nodemon for server, HMR for widgets).

## 2. Connect to AI Assistants (Optional)

Ask user if they want to test in ChatGPT/Claude or just use local devtools.

If yes, expose the local server via Alpic tunnel:

```bash
alpic tunnel --port 3000
```

Extract the forwarding URL from Alpic tunnel output (e.g., `https://cool-marmot-fondue-420.alpic.dev`).

### Connect to ChatGPT
Provide the user with these instructions to create the app in ChatGPT:
1. Go to [Apps Settings](https://chatgpt.com/apps#settings/Connectors) → Create App
2. Enter a name and description for the app
3. Paste this URL: `{tunnel-url}/mcp`
4. Set the appropriate Authentication scheme. In doubt, pick "No Authentication"
5. Click Create
6. Test by typing `@{app-name}` in a ChatGPT chat

**Troubleshooting:**
- 'Create App' button missing: ask user to enable Developer mode in Settings → Apps → Advanced Settings
- 'Create App' button not working: confirm they have ChatGPT Plus, Pro, Business, or Enterprise/Edu plan


### Connect to Claude
Provide the user with these instructions to create the app in Claude:
1. Go to [Connector Settings](https://claude.ai/settings/connectors) → Add Custom Connector
2. Enter a name and URL: `{tunnel-url}/mcp`
3. Click Create
4. In Claude chat, click the `+` button and select `@{app-name}`

**Troubleshooting:**
- 'Add Custom Connector' button missing: confirm they have a Claude paid plan