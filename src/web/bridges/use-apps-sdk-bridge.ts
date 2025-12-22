import { useSyncExternalStore } from "react";
import {
  type OpenAiProperties,
  SET_GLOBALS_EVENT_TYPE,
  type SetGlobalsEvent,
} from "../types.js";

export function useAppsSdkBridge<K extends keyof OpenAiProperties>(
  key: K,
): OpenAiProperties[K] {
  return useSyncExternalStore(
    (onChange) => {
      const handleSetGlobal = (event: SetGlobalsEvent) => {
        const value = event.detail.globals[key];
        if (value === undefined) {
          return;
        }

        onChange();
      };

      window.addEventListener(SET_GLOBALS_EVENT_TYPE, handleSetGlobal, {
        passive: true,
      });

      return () => {
        window.removeEventListener(SET_GLOBALS_EVENT_TYPE, handleSetGlobal);
      };
    },
    () => {
      if (window.openai === undefined) {
        throw new Error(
          `window.openai is not available. Make sure you're calling the hook requiring ${key} within the OpenAI iFrame skybridge runtime.`,
        );
      }

      return window.openai[key];
    },
  );
}
