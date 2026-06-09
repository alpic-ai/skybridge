import { McpServer } from "skybridge/server";
import { readPosition, STARTING_FEN } from "./lib/engine.js";

// Deliberately tiny server. The only thing it does is open the board — all of
// the gameplay tools are registered by the view itself (see
// src/views/chess.tsx) through `useRegisterViewTool`, so they run inside the
// widget. The view opens on a pick-a-side lobby; once the user chooses a color
// (which also pops the board into picture-in-picture), the assistant plays the
// other side.
const server = new McpServer(
  {
    name: "skybridge-chess",
    version: "0.0.1",
  },
  { capabilities: {} },
).registerTool(
  {
    name: "start_game",
    description:
      "Open an interactive chess board. The user first picks a side (White or Black) in the view; you play the other color. If they pick Black, you are White and move first. Drive your side with the tools the view exposes — `chess_get_board_state`, `chess_get_legal_moves`, `chess_make_move`, and `chess_reset_game` — to inspect the position and answer with your moves.",
    annotations: {
      title: "Start a chess game",
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: false,
    },
    _meta: {
      "openai/toolInvocation/invoking": "Setting up the board…",
      "openai/toolInvocation/invoked": "Your move — you play White.",
    },
    view: {
      component: "chess",
      description: "Interactive chess board with view-provided tools",
    },
  },
  async () => {
    const position = readPosition(STARTING_FEN);
    return {
      structuredContent: position,
      content: [
        {
          type: "text",
          text: [
            "A fresh chess board is open on the pick-a-side lobby.",
            "Wait for the user to choose White or Black — you play the other color, and choosing also opens the board in picture-in-picture.",
            'If they pick White, hold until they move, then reply with your Black move via the `chess_make_move` view tool (for example `{ "san": "e5" }`). If they pick Black, the view will prompt you to open as White.',
            "Lean on `chess_get_board_state` and `chess_get_legal_moves` to study the position first.",
          ].join(" "),
        },
      ],
      isError: false,
    };
  },
);

export default await server.run();

export type AppType = typeof server;
