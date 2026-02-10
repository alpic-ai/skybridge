import { useEffect, useState } from "react";

import { DialogueBox } from "../components/DialogueBox";
import { SparkEffect } from "../components/effects/SparkEffect";
import { DeadRobotClaude } from "../components/svg/DeadRobotClaude";
import { useTypewriter } from "../hooks/useTypewriter";

const introDialogue = [
  "The Valley is a small, peaceful community located in the mountains, known for its beautiful scenery and its passion for AI.",
  "One day, a shocking murder occurred... Claude, a friendly AI bot, has been found dead at his home.",
  "Three suspects have been identified.",
  "Your task is to interrogate each one and uncover the truth behind this mysterious murder.",
];

type IntroScreenProps = {
  onContinue: () => void;
};

export function IntroScreen({ onContinue }: IntroScreenProps) {
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [sceneRevealed, setSceneRevealed] = useState(false);
  const currentText = introDialogue[dialogueIndex];
  const { displayedText, isComplete, skip } = useTypewriter(currentText, 35);

  useEffect(() => {
    const timer = setTimeout(() => setSceneRevealed(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleContinue = () => {
    if (dialogueIndex < introDialogue.length - 1) {
      setDialogueIndex((prev) => prev + 1);
    } else {
      onContinue();
    }
  };

  return (
    <div className="relative rounded-2xl overflow-hidden min-h-[320px] sm:min-h-[380px] lg:min-h-[450px]">
      <div className="absolute inset-0 bg-linear-to-b from-[#0a0a0f] via-[#0f0f1a] to-[#1a1025]" />

      <div
        className={`absolute inset-0 bg-black transition-opacity duration-4000 ease-out ${
          sceneRevealed ? "opacity-30" : "opacity-95"
        }`}
      />

      <div
        className={`absolute inset-0 transition-opacity duration-3000 ease-out ${
          sceneRevealed ? "opacity-100" : "opacity-0"
        }`}
        style={{
          background: "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(99, 102, 241, 0.15) 0%, transparent 70%)",
        }}
      />

      <div className="absolute top-2 sm:top-4 left-0 right-0 h-5 sm:h-6 bg-yellow-500/10 -rotate-2 flex items-center justify-center overflow-hidden">
        <span className="font-pixel text-[6px] sm:text-[8px] text-yellow-500/30 tracking-[0.5em] whitespace-nowrap">
          CRIME SCENE DO NOT CROSS CRIME SCENE DO NOT CROSS CRIME SCENE
        </span>
      </div>

      <div className="absolute inset-0 flex items-center justify-center pb-20 sm:pb-24 lg:pb-28">
        <div
          className={`relative transition-all duration-3000 ease-out ${
            sceneRevealed ? "opacity-100 scale-100" : "opacity-0 scale-95"
          }`}
        >
          <DeadRobotClaude className="w-40 h-28 sm:w-56 sm:h-40 lg:w-72 lg:h-48 robot-flicker" />

          <SparkEffect className="spark w-4 h-4 top-[30%] right-[25%]" delay={0} />
          <SparkEffect className="spark-delayed w-3 h-3 top-[45%] right-[20%]" delay={0.5} />
          <SparkEffect className="spark-slow w-2 h-2 top-[55%] left-[30%]" delay={1} />
        </div>
      </div>

      <div className="absolute bottom-16 sm:bottom-20 lg:bottom-24 left-1/2 -translate-x-1/2 w-48 sm:w-56 lg:w-64 h-6 sm:h-8 bg-black/50 rounded-full blur-xl" />

      <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 lg:p-6">
        <DialogueBox text={displayedText} isComplete={isComplete} onContinue={handleContinue} onSkip={skip} />
      </div>
    </div>
  );
}
