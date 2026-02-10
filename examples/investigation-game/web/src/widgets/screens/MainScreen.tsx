import { useState } from "react";

import type { Suspect } from "../../data/suspects";
import { initialWordBank } from "../../data/puzzle";
import type { BlankState, WordItem } from "../../data/puzzle";
import { SuspectCard } from "../components/SuspectCard";
import { SolveMurderDialog } from "../components/puzzle/SolveMurderDialog";

type MainScreenProps = {
  suspects: Suspect[];
  highlightedSuspect: string | null;
  onInterrogate: (name: string) => void;
  onVictory: () => void;
};

export function MainScreen({ suspects, highlightedSuspect, onInterrogate, onVictory }: MainScreenProps) {
  const [showSolveDialog, setShowSolveDialog] = useState(false);
  const [wordBank, setWordBank] = useState<WordItem[]>(initialWordBank);
  const [blanks, setBlanks] = useState<BlankState>({});

  return (
    <div className="screen-enter relative rounded-2xl overflow-hidden min-h-[320px] sm:min-h-[360px] lg:min-h-[420px] bg-linear-to-b from-[#0a0a0f] via-[#1a1025] to-[#0f1a2a]">
      <button
        onClick={() => setShowSolveDialog(true)}
        className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 font-pixel text-[8px] sm:text-[10px] 
          px-3 py-1.5 sm:px-4 sm:py-2 bg-linear-to-b from-red-700 to-red-900 
          text-red-100 rounded-lg border border-red-500/50 
          hover:from-red-600 hover:to-red-800 transition-all duration-200
          hover:scale-105 active:scale-95"
      >
        SOLVE THE MURDER
      </button>

      <div className="text-center pt-3 sm:pt-4 lg:pt-5">
        <h2 className="header-glow font-pixel text-sm sm:text-base lg:text-lg text-purple-200 tracking-wider">
          THE SUSPECTS
        </h2>
        <p className="mt-1 text-[10px] sm:text-xs text-slate-400">Choose a suspect to interrogate</p>
      </div>

      <div className="absolute bottom-3 sm:bottom-4 lg:bottom-5 left-0 right-0 flex justify-evenly items-start px-2 sm:px-4">
        {suspects.map((suspect, index) => (
          <SuspectCard
            key={suspect.name}
            suspect={suspect}
            index={index}
            isHighlighted={highlightedSuspect === suspect.name}
            onClick={() => onInterrogate(suspect.name)}
          />
        ))}
      </div>

      <SolveMurderDialog
        isOpen={showSolveDialog}
        onClose={() => setShowSolveDialog(false)}
        onVictory={() => {
          setShowSolveDialog(false);
          onVictory();
        }}
        wordBank={wordBank}
        setWordBank={setWordBank}
        blanks={blanks}
        setBlanks={setBlanks}
      />
    </div>
  );
}
