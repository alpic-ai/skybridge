import type { CSSProperties } from "react";
import { useState } from "react";
import type { PieceDropHandlerArgs } from "react-chessboard";
import { Chessboard } from "react-chessboard";
import {
  useLayout,
  useRegisterViewTool,
  useSendFollowUpMessage,
} from "skybridge/web";
import * as z from "zod";
import {
  checkedKingSquare,
  movesFor,
  type Position,
  readPosition,
  summarize,
} from "@/lib/engine.js";
import { useMatch } from "@/lib/match.js";

import "@/index.css";

type Theme = "light" | "dark";

const TOOL = {
  boardState: "chess_get_board_state",
  legalMoves: "chess_get_legal_moves",
  makeMove: "chess_make_move",
  reset: "chess_reset_game",
} as const;

// Skybridge brand palette, dialed down to a calm blue-slate so the pieces stay
// readable. The vivid blue/cyan is reserved for accents (highlights, buttons),
// not the 64 squares. Dark mode drops into the midnight range.
const BOARD = {
  light: {
    lightSquare: "#eef2fb",
    darkSquare: "#7e97c8",
    notationOnLight: "#7e97c8",
    notationOnDark: "#eef2fb",
  },
  dark: {
    lightSquare: "#3a4a63",
    darkSquare: "#243349",
    notationOnLight: "#94a8c6",
    notationOnDark: "#3a4a63",
  },
} satisfies Record<Theme, Record<string, string>>;

const LAST_MOVE_RING = "inset 0 0 0 3px rgba(8, 245, 249, 0.9)";
const CHECK_RING = "inset 0 0 0 3px rgba(244, 63, 94, 0.95)";

function useChessViewTools() {
  useRegisterViewTool(
    {
      name: TOOL.boardState,
      description:
        "Read where the game stands: FEN, the side to move, whether that side is in check, whether the game is finished, the outcome, and the moves played so far (SAN).",
      annotations: { readOnlyHint: true },
    },
    () => {
      const { fen, log } = useMatch.getState();
      const position = readPosition(fen);
      return {
        content: [{ type: "text", text: summarize(position) }],
        structuredContent: { ...position, moves: log },
      };
    },
  );

  useRegisterViewTool(
    {
      name: TOOL.legalMoves,
      description:
        "List every legal move for the side to move. Pass `from` to keep only the moves leaving a single square (e.g. `from: 'e7'`).",
      inputSchema: {
        from: z
          .string()
          .length(2)
          .optional()
          .describe("Origin square to filter on, e.g. 'e7'."),
      },
      annotations: { readOnlyHint: true },
    },
    ({ from }) => {
      const { fen } = useMatch.getState();
      const { toMove } = readPosition(fen);
      const moves = movesFor(fen, from);
      return {
        content: [
          {
            type: "text",
            text: moves.length
              ? `Legal moves: ${moves.map((entry) => entry.san).join(", ")}`
              : "No legal moves available.",
          },
        ],
        structuredContent: { toMove, moves },
      };
    },
  );

  useRegisterViewTool(
    {
      name: TOOL.makeMove,
      description:
        "Make a move as Black. Pass either `san` (e.g. 'e5', 'Nf6', 'O-O') or both `from` and `to`. The move has to be legal and it must be Black's turn.",
      inputSchema: {
        san: z
          .string()
          .optional()
          .describe("Move in Standard Algebraic Notation, e.g. 'Nf6'."),
        from: z
          .string()
          .length(2)
          .optional()
          .describe("Origin square, e.g. 'e7'."),
        to: z
          .string()
          .length(2)
          .optional()
          .describe("Destination square, e.g. 'e5'."),
        promotion: z
          .enum(["q", "r", "b", "n"])
          .optional()
          .describe("Promotion piece when a pawn reaches the last rank."),
      },
      annotations: { readOnlyHint: false },
    },
    ({ san, from, to, promotion }) => {
      const request = san
        ? { san }
        : from && to
          ? { from, to, promotion }
          : null;
      if (!request) {
        return {
          content: [
            {
              type: "text",
              text: "Pass either `san`, or both `from` and `to`.",
            },
          ],
          isError: true,
        };
      }

      const result = useMatch.getState().play(request);
      if (!result.ok) {
        return {
          content: [{ type: "text", text: result.reason }],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Played ${result.move.san}. ${summarize(result.position)}`,
          },
        ],
        structuredContent: result.position,
      };
    },
  );

  useRegisterViewTool(
    {
      name: TOOL.reset,
      description:
        "Clear the board back to the opening position (White to move).",
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    () => {
      useMatch.getState().restart();
      return {
        content: [
          {
            type: "text",
            text: "Board cleared. White (the player) moves first.",
          },
        ],
        structuredContent: readPosition(useMatch.getState().fen),
      };
    },
  );
}

function statusText(position: Position): string {
  if (position.over) {
    if (position.outcome === "draw") {
      return "Draw";
    }
    return position.outcome === "white" ? "White wins" : "Black wins";
  }
  const side = position.toMove === "w" ? "White" : "Black";
  return `${side} to move${position.check ? " · check" : ""}`;
}

// Render the SAN log as numbered pairs: "1. e4 e5  2. Nf3 …".
function formatLog(log: string[]): string {
  const pairs: string[] = [];
  for (let ply = 0; ply < log.length; ply += 2) {
    const number = ply / 2 + 1;
    const white = log[ply];
    const black = log[ply + 1];
    pairs.push(black ? `${number}. ${white} ${black}` : `${number}. ${white}`);
  }
  return pairs.join("  ");
}

export default function ChessView() {
  const { theme: hostTheme } = useLayout();
  const [themeOverride, setThemeOverride] = useState<Theme | null>(null);
  const theme: Theme = themeOverride ?? hostTheme;

  const sendFollowUpMessage = useSendFollowUpMessage();
  useChessViewTools();

  const fen = useMatch((store) => store.fen);
  const toMove = useMatch((store) => store.toMove);
  const over = useMatch((store) => store.over);
  const log = useMatch((store) => store.log);
  const lastMove = useMatch((store) => store.lastMove);
  const play = useMatch((store) => store.play);
  const restart = useMatch((store) => store.restart);

  const position = readPosition(fen);
  const playerToMove = toMove === "w" && !over;
  const palette = BOARD[theme];

  const squareStyles: Record<string, CSSProperties> = {};
  if (lastMove) {
    squareStyles[lastMove.from] = { boxShadow: LAST_MOVE_RING };
    squareStyles[lastMove.to] = { boxShadow: LAST_MOVE_RING };
  }
  const kingInCheck = checkedKingSquare(fen);
  if (kingInCheck) {
    squareStyles[kingInCheck] = {
      boxShadow: CHECK_RING,
      background: "rgba(244, 63, 94, 0.35)",
    };
  }

  const onPieceDrop = ({
    sourceSquare,
    targetSquare,
  }: PieceDropHandlerArgs) => {
    if (!targetSquare || !playerToMove) {
      return false;
    }
    const result = play({
      from: sourceSquare,
      to: targetSquare,
      promotion: "q",
    });
    if (!result.ok) {
      return false;
    }
    if (!result.position.over) {
      sendFollowUpMessage(
        `I played ${result.move.san} as White. Your turn — answer as Black with the ${TOOL.makeMove} tool.`,
      );
    }
    return true;
  };

  return (
    <div className="chess-app" data-theme={theme}>
      <header className="chess-header">
        <div className="chess-brand">
          <span className="chess-mark" aria-hidden="true" />
          <div>
            <h1 className="chess-title">Skybridge Chess</h1>
            <p className="chess-subtitle">
              You play White · the assistant plays Black
            </p>
          </div>
        </div>
        <div className="chess-actions">
          <button
            type="button"
            className="chess-icon-button"
            aria-label={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
            onClick={() =>
              setThemeOverride(theme === "dark" ? "light" : "dark")
            }
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
          <button
            type="button"
            className="chess-reset"
            onClick={() => restart()}
          >
            New game
          </button>
        </div>
      </header>

      <div className="chess-board">
        <Chessboard
          options={{
            position: fen,
            onPieceDrop,
            boardOrientation: "white",
            allowDragging: playerToMove,
            id: "skybridge-chess",
            animationDurationInMs: 200,
            boardStyle: {
              borderRadius: "12px",
              overflow: "hidden",
            },
            lightSquareStyle: { backgroundColor: palette.lightSquare },
            darkSquareStyle: { backgroundColor: palette.darkSquare },
            lightSquareNotationStyle: { color: palette.notationOnLight },
            darkSquareNotationStyle: { color: palette.notationOnDark },
            squareStyles,
          }}
        />
      </div>

      <footer className="chess-status">
        <span className="chess-status-badge">{statusText(position)}</span>
        {log.length > 0 && (
          <span className="chess-moves">{formatLog(log)}</span>
        )}
        {!over && toMove === "b" && (
          <span className="chess-hint">Waiting for the assistant…</span>
        )}
      </footer>
    </div>
  );
}
