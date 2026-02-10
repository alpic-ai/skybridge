import type { DragEvent } from "react";

type WordChipProps = {
  word: string;
  wordId: string;
  isDragging: boolean;
  onDragStart: (e: DragEvent<HTMLDivElement>, wordId: string) => void;
  onDragEnd: () => void;
};

export function WordChip({ word, wordId, isDragging, onDragStart, onDragEnd }: WordChipProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, wordId)}
      onDragEnd={onDragEnd}
      className={`word-chip px-3 py-1.5 sm:px-4 sm:py-2 bg-linear-to-b from-amber-600 to-amber-800 
      border-2 border-amber-400/50 rounded-lg cursor-grab active:cursor-grabbing 
      font-pixel text-[10px] sm:text-xs text-amber-100 select-none
      transition-all duration-200 hover:from-amber-500 hover:to-amber-700
      ${isDragging ? "opacity-50 scale-95" : "hover:scale-105"}`}
    >
      {word}
    </div>
  );
}
