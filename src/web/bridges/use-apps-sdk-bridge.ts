import { useSyncExternalStore } from "react";
import {
  type OpenAiProperties,
  SET_GLOBALS_EVENT_TYPE,
  type SetGlobalsEvent,
} from "../types.js";
import { NOOP_GET_SNAPSHOT, NOOP_SUBSCRIBE } from "./constants.js";

let appsSdkBridge: AppsSdkBridge | null = null;

export function getAppsSdkBridge(): AppsSdkBridge {
  if (appsSdkBridge === null) {
    appsSdkBridge = new AppsSdkBridge();
  }
  return appsSdkBridge;
}

export class AppsSdkBridge {
  subscribe = (key: keyof OpenAiProperties) => (onChange: () => void) => {
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
  };
  getSnapshot = <K extends keyof OpenAiProperties>(key: K) => {
    if (window.openai === undefined) {
      throw new Error(
        `window.openai is not available. Make sure you're calling the hook requiring ${key} within the OpenAI iFrame skybridge runtime.`,
      );
    }

    return window.openai[key];
  };
}

export function useAppsSdkBridge<K extends keyof OpenAiProperties>(
  key: K,
): OpenAiProperties[K] | undefined {
  const hostType = window.skybridge.hostType;
  const bridge = hostType === "chatgpt-app" ? getAppsSdkBridge() : null;

  return useSyncExternalStore(
    bridge ? bridge.subscribe(key) : NOOP_SUBSCRIBE,
    bridge ? () => bridge.getSnapshot(key) : NOOP_GET_SNAPSHOT,
  );
}
