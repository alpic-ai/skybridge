import { useEffect } from "react";
import { useViewState } from "skybridge/web";
import beret from "./images/mascot/beret.png";
import chapka from "./images/mascot/chapka.png";
import cowboyHat from "./images/mascot/cowboy-hat.png";
import fez from "./images/mascot/fez.png";
import jesterHat from "./images/mascot/jester-hat.png";
import mitre from "./images/mascot/mitre.png";
import nonLa from "./images/mascot/non-la.png";
import original from "./images/mascot/original.png";
import propellerBeanie from "./images/mascot/propeller-beanie.png";
import skiMask from "./images/mascot/ski-mask.png";
import sombrero from "./images/mascot/sombrero.png";
import topHat from "./images/mascot/top-hat.png";
import vikingHelmet from "./images/mascot/viking-helmet.png";

const Hats = {
  beret,
  chapka,
  "cowboy hat": cowboyHat,
  fez,
  "jester hat": jesterHat,
  mitre,
  "nón lá": nonLa,
  "propeller beanie": propellerBeanie,
  "ski mask": skiMask,
  sombrero,
  "top hat": topHat,
  "viking helmet": vikingHelmet,
} as const;

type HatLabel = keyof typeof Hats;

const LABELS = Object.keys(Hats) as HatLabel[];

export function useMascot() {
  // useViewState: persist UI state on the host and surface it to the model.
  const [state, setState] = useViewState<{ hat?: HatLabel }>({});
  const { hat } = state;
  const img = hat ? Hats[hat] : original;

  // Preload all hats once so swaps are instant.
  useEffect(() => {
    for (const src of Object.values(Hats)) {
      new Image().src = src;
    }
  }, []);

  return {
    img,
    hat,
    changeHat: () => {
      setState((prev) => {
        const currentIndex = prev.hat ? LABELS.indexOf(prev.hat) : -1;
        const next = LABELS[(currentIndex + 1) % LABELS.length];
        return { ...prev, hat: next };
      });
    },
  };
}
