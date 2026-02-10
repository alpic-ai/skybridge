import { useCallback, useState } from "react";
import type { DragEvent, Dispatch, SetStateAction } from "react";
import { useSendFollowUpMessage } from "skybridge/web";

import type { BlankState, SentenceSegment, WordItem } from "../../../data/puzzle";
import { puzzleSentences } from "../../../data/puzzle";
import { BlankDropZone } from "./BlankDropZone";
import { WordChip } from "./WordChip";

type SolveMurderDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onVictory: () => void;
  wordBank: WordItem[];
  setWordBank: Dispatch<SetStateAction<WordItem[]>>;
  blanks: BlankState;
  setBlanks: Dispatch<SetStateAction<BlankState>>;
};

export function SolveMurderDialog({
  isOpen,
  onClose,
  onVictory,
  wordBank,
  setWordBank,
  blanks,
  setBlanks,
}: SolveMurderDialogProps) {
  const sendFollowUpMessage = useSendFollowUpMessage();
  const [draggedWord, setDraggedWord] = useState<{ wordId: string; fromBlank?: string } | null>(null);
  const [dragOverBlank, setDragOverBlank] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: "error" | "warning" } | null>(null);

  const getAllBlankIds = (): string[] => {
    return puzzleSentences.flatMap((sentence) =>
      sentence
        .filter((seg): seg is Extract<SentenceSegment, { type: "blank" }> => seg.type === "blank")
        .map((seg) => seg.id),
    );
  };

  const getCorrectWord = (blankId: string): string => {
    for (const sentence of puzzleSentences) {
      for (const seg of sentence) {
        if (seg.type === "blank" && seg.id === blankId) {
          return seg.correctWord;
        }
      }
    }
    return "";
  };

  const countErrors = useCallback(() => {
    const allBlankIds = getAllBlankIds();
    let errorCount = 0;
    for (const blankId of allBlankIds) {
      const filled = blanks[blankId];
      if (!filled || filled.word !== getCorrectWord(blankId)) {
        errorCount++;
      }
    }
    return errorCount;
  }, [blanks]);

  const handleDragStartFromBank = (e: DragEvent<HTMLDivElement>, wordId: string) => {
    e.dataTransfer.effectAllowed = "move";
    setDraggedWord({ wordId });
  };

  const handleDragStartFromBlank = (e: DragEvent<HTMLSpanElement>, wordId: string, fromBlankId: string) => {
    e.dataTransfer.effectAllowed = "move";
    setDraggedWord({ wordId, fromBlank: fromBlankId });
  };

  const handleDragEnd = () => {
    setDraggedWord(null);
    setDragOverBlank(null);
  };

  const handleDragOver = (e: DragEvent<HTMLSpanElement>, blankId: string) => {
    e.preventDefault();
    setDragOverBlank(blankId);
  };

  const handleDragLeave = () => {
    setDragOverBlank(null);
  };

  const handleDrop = (blankId: string) => {
    if (!draggedWord) return;

    const { wordId, fromBlank } = draggedWord;

    let wordItem: WordItem | undefined;

    if (fromBlank) {
      wordItem = blanks[fromBlank] ?? undefined;
    } else {
      wordItem = wordBank.find((w) => w.id === wordId);
    }

    if (!wordItem) return;

    const existingWord = blanks[blankId];

    setBlanks((prev) => {
      const newBlanks = { ...prev };

      if (fromBlank) {
        newBlanks[fromBlank] = null;
      }

      newBlanks[blankId] = wordItem;

      return newBlanks;
    });

    if (!fromBlank) {
      setWordBank((prev) => prev.filter((w) => w.id !== wordId));
    }

    if (existingWord) {
      setWordBank((prev) => [...prev, existingWord]);
    }

    setDraggedWord(null);
    setDragOverBlank(null);
    setFeedbackMessage(null);
  };

  const handleSubmit = () => {
    const errors = countErrors();
    if (errors === 0) {
      sendFollowUpMessage("User solved the murder! Congratulate him for his fine detective skills");
      setTimeout(() => {
        onVictory();
      }, 500);
    } else if (errors <= 2) {
      setFeedbackMessage({ text: "Less than two errors", type: "warning" });
    } else {
      setFeedbackMessage({ text: "Too many errors", type: "error" });
    }
  };

  const allBlanksFilled = getAllBlankIds().every((id) => blanks[id] !== null && blanks[id] !== undefined);

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-2xl">
      <div className="dialog-content w-[95%] max-w-3xl max-h-[90%] bg-linear-to-b from-[#1a1025] to-[#0f1a2a] border-2 border-purple-500/50 rounded-xl overflow-hidden flex flex-col">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-purple-500/30">
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-xl leading-none flex items-center justify-center -mt-1"
          >
            ×
          </button>
          <h3 className="font-pixel text-xs sm:text-sm text-purple-200 tracking-wider">SOLVE THE MURDER</h3>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/3 p-3 sm:p-4 border-r border-purple-500/30 flex flex-col overflow-y-auto">
            <p className="font-pixel text-[8px] sm:text-[10px] text-slate-400 mb-3 shrink-0">DRAG WORDS</p>
            <div className="flex flex-wrap gap-2 content-start">
              {wordBank.map((item) => (
                <WordChip
                  key={item.id}
                  word={item.word}
                  wordId={item.id}
                  isDragging={draggedWord?.wordId === item.id}
                  onDragStart={handleDragStartFromBank}
                  onDragEnd={handleDragEnd}
                />
              ))}
            </div>
          </div>

          <div className="w-2/3 p-3 sm:p-4 overflow-y-auto">
            <p className="font-pixel text-[8px] sm:text-[10px] text-slate-400 mb-3">COMPLETE THE STORY</p>
            <div className="space-y-4">
              {puzzleSentences.map((sentence, sIdx) => (
                <p key={sIdx} className="text-[11px] sm:text-sm text-slate-300 leading-relaxed">
                  {sentence.map((segment, segIdx) =>
                    segment.type === "text" ? (
                      <span key={segIdx}>{segment.content}</span>
                    ) : (
                      <BlankDropZone
                        key={segIdx}
                        blankId={segment.id}
                        filledWord={blanks[segment.id] ?? null}
                        isOver={dragOverBlank === segment.id}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDragStartFromBlank={handleDragStartFromBlank}
                        onDragEnd={handleDragEnd}
                      />
                    ),
                  )}
                </p>
              ))}
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-purple-500/30 flex items-center justify-between">
          <div className="flex-1">
            {feedbackMessage && (
              <p
                className={`font-pixel text-[10px] sm:text-xs ${
                  feedbackMessage.type === "error" ? "text-red-400" : "text-yellow-400"
                }`}
              >
                {feedbackMessage.text}
              </p>
            )}
          </div>
          <button
            onClick={handleSubmit}
            disabled={!allBlanksFilled}
            className={`font-pixel text-[10px] sm:text-xs px-4 sm:px-6 py-2 rounded-lg transition-all duration-200
              ${
                allBlanksFilled
                  ? "bg-linear-to-b from-green-600 to-green-800 text-white border border-green-400/50 hover:from-green-500 hover:to-green-700"
                  : "bg-slate-700 text-slate-500 border border-slate-600 cursor-not-allowed"
              }`}
          >
            SUBMIT
          </button>
        </div>
      </div>
    </div>
  );
}
