type DialogueBoxProps = {
  text: string;
  isComplete: boolean;
  onContinue: () => void;
  onSkip: () => void;
};

export function DialogueBox({ text, isComplete, onContinue, onSkip }: DialogueBoxProps) {
  return (
    <div
      className="dialogue-box dialogue-slide-up px-4 py-3 lg:px-6 lg:py-4 cursor-pointer select-none"
      onClick={isComplete ? onContinue : onSkip}
    >
      <p className="font-pixel text-xs sm:text-sm lg:text-base text-amber-100 leading-relaxed lg:leading-loose min-h-12 lg:min-h-14">
        {text}
        {!isComplete && <span className="cursor-blink text-amber-300">▌</span>}
      </p>
    </div>
  );
}
