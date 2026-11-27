# Verify Your Work

A tool or view is not done until you have seen it work yourself. Never end by asking the user to open DevTools, a browser or ChatGPT to check: run the checks below and show their output.

## 1. Start the dev server in the background

```bash
npx skybridge dev --plain > dev.log 2>&1 &
until grep -q 'localhost:' dev.log; do sleep 1; done
PORT=$(grep -om1 'localhost:[0-9]*' dev.log | cut -d: -f2)
until curl -s -o /dev/null http://localhost:$PORT/; do sleep 1; done; cat dev.log
```

`--plain` prints plain logs instead of the interactive UI, which stays blank when not run in a terminal. The server runs on port 3000, or 3001, 3002… when 3000 is taken; `PORT` holds the one it picked. Fix any TypeScript or startup error in `dev.log` before going further.

## 2. Call each tool you changed

```bash
mcp() { curl -s http://localhost:$PORT/mcp -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' -d "$1"; }

mcp '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
mcp '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"search-flights","arguments":{"destination":"Paris"}}}'
```

Check that `tools/call` does not return `"isError":true`. For a tool with a view, also check that `tools/list` shows it with `_meta.ui.resourceUri` and that `tools/call` returns the `structuredContent` the view expects.

## 3. Check the view compiles

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:$PORT/assets/src/views/search-flights.tsx
```

Use the view file's path under `src/views/`. `200` means Vite compiled the view. Anything else means it failed: the compile error is at the end of `dev.log`.

## 4. Render the view in a browser

Do this whenever you have any browser tool (Browser, Playwright, chrome-devtools-mcp with or without WebMCP; see [run-locally.md](run-locally.md)). It is the only check that proves the view renders.

1. Open `http://localhost:$PORT/` (the DevTools).
2. Click the tool's button in the tool list, fill its inputs, press **Run**.
3. Take a snapshot of the rendered view (the `html-preview` iframe) and check it shows the tool's output, not a blank frame or an error.
4. Interactive view? Do what a user would: click, type, select, submit. Snapshot again and check the UI and any state changed as expected (e.g. an added item appears, a selection is highlighted, a button sends the follow-up message).
5. Read the browser console for errors.

No browser tool at all? Steps 1 to 3 are the minimum, and say in your final message that the view was not rendered in a browser.

## 5. Report

End with what you ran and what you saw (tool output, snapshot, errors fixed), then the DevTools URL for the user to try it.
