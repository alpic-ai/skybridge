# Skybridge Chess

Play chess against the assistant inside the conversation. The board opens on a
**pick-a-side lobby**: choose **White** or **Black** to start. Picking a color
is the user gesture that lets the view pop the board into **fullscreen**
(via `useDisplayMode`), so you can keep chatting while you play. You drag your
pieces; the assistant plays the other color (and opens the game if you take
Black).

This example is a Skybridge port of [MCPJam/chess-mcp](https://github.com/MCPJam/chess-mcp),
and its purpose is to showcase **MCP Apps view-provided tools** — the
[`ext-apps` "app-provided tools"](https://github.com/modelcontextprotocol/ext-apps/pull/72)
feature.

## What it demonstrates

Most of the game logic is **not** on the server. The server exposes a single
`start_game` tool that opens the board. The **view** then registers the tools
the model actually uses to play, with `useRegisterViewTool`:

| Tool | Runs in | Purpose |
| --- | --- | --- |
| `start_game` | server | Opens the board |
| `chess_get_board_state` | **view** | Read FEN, turn, check, result, history |
| `chess_get_legal_moves` | **view** | List legal moves (optionally from a square) |
| `chess_make_move` | **view** | Play a move as the assistant's color |
| `chess_reset_game` | **view** | Reset to the starting position |

The host discovers the view tools via `tools/list` and invokes them via
`tools/call`, executing the handlers **inside the running widget** against a
[chess.js](https://github.com/jhlywa/chess.js) engine. The match lives in a
Skybridge synced store (`createStore`) that also keeps the move log and the last
move played, so the full game is pushed into the model's context on every change
and survives a view remount. The chess logic is a thin, stateless wrapper
(`src/lib/engine.ts`) — every helper rebuilds the engine from a FEN on demand.

### Pick a side & fullscreen

The view starts on a lobby with two buttons (White / Black). Picking a color
calls the match store's `start` action and immediately requests
`setDisplayMode("fullscreen")` — most hosts only grant fullscreen in response
to a user gesture, so the color choice doubles as that gesture. If you pick
Black, the view fires a `sendFollowUpMessage` asking the assistant (White) to
make the opening move.

### The turn loop

1. You drag one of your pieces. chess.js validates the move.
2. The view calls `sendFollowUpMessage`, asking the assistant (as the user) to
   reply with its move on the other color.
3. The assistant calls the `chess_make_move` **view tool**, which updates the
   board in place.

### Look & feel

The board is themed with the Skybridge palette (blue `#002FFF` → cyan
`#08F5F9`), highlights the last move and any king in check, and ships a dark
mode that follows the host theme with a manual toggle in the header.

## Runtime support

> View-provided tools are an **MCP Apps** feature. In the ChatGPT Apps SDK
> runtime (`window.openai`) there is no equivalent, so `useRegisterViewTool` is
> a no-op there — the human can still drag pieces, but the assistant cannot
> call the view tools. Run this in an MCP Apps host (e.g. Claude) to see the
> full loop.

## Develop

```bash
pnpm install
pnpm dev
```

Then open the devtools URL printed in the terminal.
