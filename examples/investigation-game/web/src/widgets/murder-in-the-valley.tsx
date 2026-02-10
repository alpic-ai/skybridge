import "@/index.css";
import { useCallback, useState } from "react";

import { mountWidget, useDisplayMode, useSendFollowUpMessage } from "skybridge/web";

import { suspects } from "../data/suspects";
import { ScreenTransition } from "./components/ScreenTransition";
import { IntroScreen } from "./screens/IntroScreen";
import { MainScreen } from "./screens/MainScreen";
import { StartScreen } from "./screens/StartScreen";
import { VictoryScreen } from "./screens/VictoryScreen";

type GameState = "start" | "intro" | "main" | "victory";

function MurderWidget() {
  const [gameState, setGameState] = useState<GameState>("start");
  const [highlightedSuspect, setHighlightedSuspect] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [, setDisplayMode] = useDisplayMode();
  const sendFollowUpMessage = useSendFollowUpMessage();

  const handleInterrogate = (suspectName: string) => {
    setHighlightedSuspect(suspectName);
    sendFollowUpMessage(`User has decided to interrogate ${suspectName}`);
  };

  const transitionTo = useCallback((newState: GameState) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setGameState(newState);
      setIsTransitioning(false);
    }, 400);
  }, []);

  if (gameState === "start") {
    return (
      <ScreenTransition screenKey="start">
        <div className={`transition-all duration-400 ${isTransitioning ? "opacity-0 scale-98" : "opacity-100 scale-100"}`}>
          <StartScreen
            onStart={() => {
              transitionTo("intro");
              setDisplayMode("fullscreen");
            }}
          />
        </div>
      </ScreenTransition>
    );
  }

  if (gameState === "intro") {
    return (
      <ScreenTransition screenKey="intro">
        <div className={`transition-all duration-400 ${isTransitioning ? "opacity-0 scale-98" : "opacity-100 scale-100"}`}>
          <IntroScreen onContinue={() => transitionTo("main")} />
        </div>
      </ScreenTransition>
    );
  }

  if (gameState === "victory") {
    return (
      <ScreenTransition screenKey="victory">
        <VictoryScreen />
      </ScreenTransition>
    );
  }

  return (
    <ScreenTransition screenKey="main">
      <MainScreen
        suspects={suspects}
        highlightedSuspect={highlightedSuspect}
        onInterrogate={handleInterrogate}
        onVictory={() => transitionTo("victory")}
      />
    </ScreenTransition>
  );
}

export default MurderWidget;

mountWidget(<MurderWidget />);
