# Running Locally Workflow

## 1. Start Dev Server

Install dependencies and start the dev server in the background:

```bash
{pm} install && {pm} run dev
```

For Deno projects, use `deno task dev` instead.

When started, output the local MCP server and devtools URL.

Hot reload enabled (nodemon for server, HMR for views).

## 2. Test in DevTools via Chrome DevTools MCP (Optional)

Use the devtools to render views locally. Use this method when iterating with the user on the rendered result of its app.

The devtools page exposes WebMCP tools, powering faster interactions than with traditional click/fill/screenshot interactions. Requires the Chrome DevTools MCP server running with `--categoryExperimentalWebmcp=true`, which adds the `list_webmcp_tools` and `execute_webmcp_tool` tools.

1. `navigate_page` to the devtools URL output by the dev server
2. `list_webmcp_tools` to discover the page's tools:
   - one tool per app tool — executes it on the local MCP server, returns its result, and renders its view in the preview pane
   - `devtools_set_view_options` — sets any subset of `displayMode` (`inline`|`pip`|`fullscreen`), `darkTheme` (boolean), `mobileDevice` (boolean), `locale` (BCP 47 code)
3. `execute_webmcp_tool` with `toolName` and JSON-stringified `input`

Interactions inside the rendered view itself are not WebMCP tools, use regular DOM understanding and interactions. Use `take_screenshot` only to visually verify rendering — screenshot the preview iframe (accessible name `html-preview` in the page snapshot) rather than the full page.

## 3. Connect to AI Assistants (Optional)

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