import { useSyncExternalStore } from "react";
import {
  SET_GLOBALS_EVENT_TYPE,
  SetGlobalsEvent,
  type OpenaiGlobals,
} from "./types";

export function useOpenaiGlobal<K extends keyof OpenaiGlobals>(
  key: K
): OpenaiGlobals[K] {
  const subscribe = (onStoreChange: () => void) => {
    const handleSetGlobal = ({ detail: { globals } }: SetGlobalsEvent) => {
      if (globals[key] === undefined) {
        return;
      }

      onStoreChange();
    };

    window.addEventListener(SET_GLOBALS_EVENT_TYPE, handleSetGlobal, {
      passive: true,
    });

    return () => {
      window.removeEventListener(SET_GLOBALS_EVENT_TYPE, handleSetGlobal);
    };
  };

  const getSnapshot = () => window.openai[key];

  return useSyncExternalStore(subscribe, getSnapshot);
}
