import { createStore } from "skybridge/web";
import {
  type MoveRequest,
  type MoveResult,
  type PlayedMove,
  type Position,
  readPosition,
  STARTING_FEN,
  tryMove,
} from "./engine.js";

// The live match, mirrored into the host's view state. Because it is synced,
// the model sees every position change and the board survives a remount.
//
// We keep the move log and the last move here rather than asking chess.js for
// them: the engine is rebuilt from a bare FEN on each call, which carries the
// position but not the line that led to it. Tracking them in the store is the
// single source of truth for both the UI and the model.
type Match = Position & {
  human: "w";
  assistant: "b";
  log: string[];
  lastMove: PlayedMove | null;
  play: (request: MoveRequest) => MoveResult;
  restart: () => void;
};

function freshMatch() {
  return {
    ...readPosition(STARTING_FEN),
    log: [] as string[],
    lastMove: null as PlayedMove | null,
  };
}

export const useMatch = createStore<Match>((set, get) => ({
  ...freshMatch(),
  human: "w",
  assistant: "b",
  play: (request) => {
    const result = tryMove(get().fen, request);
    if (result.ok) {
      set({
        ...result.position,
        lastMove: result.move,
        log: [...get().log, result.move.san],
      });
    }
    return result;
  },
  restart: () => set(freshMatch()),
}));
