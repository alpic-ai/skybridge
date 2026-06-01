import { McpServer } from "skybridge/server";
import { readPosition, STARTING_FEN } from "./lib/engine.js";

// Deliberately tiny server. The only thing it does is open the board — all of
// the gameplay tools are registered by the view itself (see
// src/views/chess.tsx) through `useRegisterViewTool`, so they run inside the
// widget. The human is White and moves first; the assistant answers as Black.
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
      "Open an interactive chess board. The user plays White and moves first; you play Black. After the board is open, drive your side with the tools the view exposes — `chess_get_board_state`, `chess_get_legal_moves`, `chess_make_move`, and `chess_reset_game` — to inspect the position and answer with Black's moves.",
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
            "A fresh chess game is on the board.",
            "White belongs to the user and moves first; you are Black.",
            'Hold until the user has moved, then reply with Black\'s move by calling the `chess_make_move` view tool (for example `{ "san": "e5" }`).',
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
