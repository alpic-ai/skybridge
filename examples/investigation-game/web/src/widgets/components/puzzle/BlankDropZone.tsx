import type { DragEvent } from "react";
import type { WordItem } from "../../../data/puzzle";

type BlankDropZoneProps = {
  blankId: string;
  filledWord: WordItem | null;
  isOver: boolean;
  onDrop: (blankId: string) => void;
  onDragOver: (e: DragEvent<HTMLSpanElement>, blankId: string) => void;
  onDragLeave: () => void;
  onDragStartFromBlank: (e: DragEvent<HTMLSpanElement>, wordId: string, fromBlankId: string) => void;
  onDragEnd: () => void;
};

export function BlankDropZone({
  blankId,
  filledWord,
  isOver,
  onDrop,
  onDragOver,
  onDragLeave,
  onDragStartFromBlank,
  onDragEnd,
}: BlankDropZoneProps) {
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[60px] sm:min-w-[80px] h-6 sm:h-8 mx-1 px-2
      border-2 border-dashed rounded transition-all duration-200 align-middle
      ${
        filledWord
          ? "bg-purple-900/50 border-purple-400"
          : isOver
            ? "bg-purple-800/50 border-purple-300 scale-105"
            : "bg-slate-800/50 border-slate-500"
      }`}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(blankId);
      }}
      onDragOver={(e) => onDragOver(e, blankId)}
      onDragLeave={onDragLeave}
    >
      {filledWord ? (
        <span
          draggable
          onDragStart={(e) => onDragStartFromBlank(e, filledWord.id, blankId)}
          onDragEnd={onDragEnd}
          className="font-pixel text-[9px] sm:text-[11px] text-amber-200 cursor-grab active:cursor-grabbing"
        >
          {filledWord.word}
        </span>
      ) : (
        <span className="font-pixel text-[9px] sm:text-[11px] text-transparent select-none">____</span>
      )}
    </span>
  );
}
