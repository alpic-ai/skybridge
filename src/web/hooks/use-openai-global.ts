import { useSyncExternalStore } from "react";
import {
  type OpenAiProperties,
  SET_GLOBALS_EVENT_TYPE,
  type SetGlobalsEvent,
} from "../types.js";

// Default: required=true, throws if undefined
export function useOpenAiGlobal<K extends keyof OpenAiProperties>(
  key: K,
): OpenAiProperties[K];

// Explicit required: false, returns undefined if not available
export function useOpenAiGlobal<K extends keyof OpenAiProperties>(
  key: K,
  options: { required: false },
): OpenAiProperties[K] | undefined;

export function useOpenAiGlobal<K extends keyof OpenAiProperties>(
  key: K,
  options?: { required?: boolean },
): OpenAiProperties[K] | undefined {
  const required = options?.required ?? true;

  const value = useSyncExternalStore(
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
    () => window.openai?.[key],
  );

  if (required && value === undefined) {
    throw new Error(
      `${key} is not available. Make sure you're calling this hook within the OpenAI iFrame skybridge runtime.`,
    );
  }

  return value;
}
