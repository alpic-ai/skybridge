import { useSyncExternalStore } from "react";
import {
  type OpenAiProperties,
  SET_GLOBALS_EVENT_TYPE,
  type SetGlobalsEvent,
} from "../types.js";

export function useOpenAiGlobal<K extends keyof OpenAiProperties>(
  key: K,
): OpenAiProperties[K] | undefined {
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
      if (!window.openai) {
        throw new Error(
          "openai is not defined on window. Please make sure to only call this hook inside the OpenAI iFrame skybridge runtime.",
        );
      }
      return window.openai[key];
    },
  );
}
