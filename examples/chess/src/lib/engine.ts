import { Chess, type Square } from "chess.js";

// A thin, stateless wrapper around chess.js. Every helper takes a FEN and
// rebuilds the engine on demand, so nothing here holds mutable game state — the
// running match lives in the synced store (see match.ts). White is always the
// human, Black is always the assistant.

export type Side = "w" | "b";
export type Promotion = "q" | "r" | "b" | "n";

/** How the game stands right now. `"ongoing"` means nobody has won yet. */
export type Outcome = "ongoing" | "white" | "black" | "draw";

export type MoveRequest =
  | { san: string }
  | { from: string; to: string; promotion?: Promotion };

/** A serialisable read of the board, derived purely from a FEN string. */
export type Position = {
  fen: string;
  toMove: Side;
  check: boolean;
  over: boolean;
  outcome: Outcome;
};

export const STARTING_FEN = new Chess().fen();

function decideOutcome(engine: Chess): Outcome {
  if (engine.isCheckmate()) {
    // Whoever is on the move has been mated, so the other side takes it.
    return engine.turn() === "w" ? "black" : "white";
  }
  if (engine.isStalemate() || engine.isDraw()) {
    return "draw";
  }
  return "ongoing";
}

export function readPosition(fen: string): Position {
  const engine = new Chess(fen);
  return {
    fen: engine.fen(),
    toMove: engine.turn(),
    check: engine.inCheck(),
    over: engine.isGameOver(),
    outcome: decideOutcome(engine),
  };
}

export type PlayedMove = { san: string; from: Square; to: Square };

export type MoveResult =
  | { ok: true; move: PlayedMove; position: Position }
  | { ok: false; reason: string };

export function tryMove(fen: string, request: MoveRequest): MoveResult {
  const engine = new Chess(fen);
  try {
    const played = engine.move("san" in request ? request.san : request);
    return {
      ok: true,
      move: { san: played.san, from: played.from, to: played.to },
      position: readPosition(engine.fen()),
    };
  } catch {
    const label =
      "san" in request ? request.san : `${request.from}→${request.to}`;
    return {
      ok: false,
      reason: `${label} is not a legal move in this position.`,
    };
  }
}

export function movesFor(fen: string, square?: string) {
  const engine = new Chess(fen);
  const verbose = square
    ? engine.moves({ square: square as Square, verbose: true })
    : engine.moves({ verbose: true });
  return verbose.map((entry) => ({
    san: entry.san,
    from: entry.from,
    to: entry.to,
    promotion: entry.promotion,
  }));
}

/** The square of the king that is currently in check, if any. */
export function checkedKingSquare(fen: string): Square | null {
  const engine = new Chess(fen);
  if (!engine.inCheck()) {
    return null;
  }
  const inDanger = engine.turn();
  for (const rank of engine.board()) {
    for (const cell of rank) {
      if (cell && cell.type === "k" && cell.color === inDanger) {
        return cell.square;
      }
    }
  }
  return null;
}

/** A one-line position summary written for the assistant to read back. */
export function summarize(position: Position): string {
  if (position.over) {
    if (position.outcome === "draw") {
      return "The game is drawn — no further moves.";
    }
    const winner =
      position.outcome === "white" ? "White (the player)" : "Black (you)";
    return `Checkmate. ${winner} has won.`;
  }
  const onMove = position.toMove === "w" ? "White (the player)" : "Black (you)";
  const flag = position.check ? " — currently in check" : "";
  return `${onMove} to move${flag}. FEN: ${position.fen}`;
}
