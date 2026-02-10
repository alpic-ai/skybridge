import type { Suspect } from "../../data/suspects";
import { suspectImages } from "../../data/images";

type SuspectCardProps = {
  suspect: Suspect;
  index: number;
  isHighlighted: boolean;
  onClick: () => void;
};

export function SuspectCard({ suspect, index, isHighlighted, onClick }: SuspectCardProps) {
  return (
    <div
      className={`card-stagger-in w-28 sm:w-36 lg:w-44 flex flex-col items-center cursor-pointer transition-all duration-200 ${
        isHighlighted ? "scale-105" : "hover:scale-105"
      }`}
      style={{ animationDelay: `${index * 0.1}s` }}
      onClick={onClick}
    >
      <div
        className={`w-24 h-28 sm:w-32 sm:h-36 lg:w-40 lg:h-44 rounded-lg border-2 overflow-hidden transition-all duration-200 ${
          isHighlighted ? "border-yellow-400 ring-2 ring-yellow-400/50" : "border-purple-500/50 hover:border-purple-400"
        }`}
      >
        <img src={suspectImages[suspect.name]} alt={suspect.name} className="w-full h-full object-cover" />
      </div>

      <div className={`mt-1.5 px-2 py-0.5 rounded transition-colors duration-200 ${isHighlighted ? "bg-yellow-400/20" : ""}`}>
        <span className={`font-pixel text-xs sm:text-sm tracking-wider ${isHighlighted ? "text-yellow-300" : "text-white"}`}>
          {suspect.name.toUpperCase()}
        </span>
      </div>

      <p
        className={`text-[9px] sm:text-[10px] uppercase tracking-wider text-center whitespace-nowrap ${
          isHighlighted ? "text-yellow-400/70" : "text-purple-400/60"
        }`}
      >
        {suspect.role}
      </p>
    </div>
  );
}
