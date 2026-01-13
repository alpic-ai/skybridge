import type { Bridge, Subscribe } from "../types.js";
import {
  type AppsSdkProperties,
  SET_GLOBALS_EVENT_TYPE,
  type SetGlobalsEvent,
} from "./types.js";

export class AppsSdkBridge implements Bridge<AppsSdkProperties> {
  private static instance: AppsSdkBridge | null = null;

  public static getInstance(): AppsSdkBridge {
    if (
      window.skybridge.hostType !== "apps-sdk" ||
      window.openai === undefined
    ) {
      throw new Error(
        "Apps SDK Bridge can only be used in the apps-sdk runtime",
      );
    }
    if (AppsSdkBridge.instance === null) {
      AppsSdkBridge.instance = new AppsSdkBridge();
    }
    return AppsSdkBridge.instance;
  }

  public static resetInstance(): void {
    if (AppsSdkBridge.instance) {
      AppsSdkBridge.instance = null;
    }
  }

  public subscribe(key: keyof AppsSdkProperties): Subscribe;
  public subscribe(keys: readonly (keyof AppsSdkProperties)[]): Subscribe;
  public subscribe(
    keyOrKeys: keyof AppsSdkProperties | readonly (keyof AppsSdkProperties)[],
  ): Subscribe {
    const keys: readonly (keyof AppsSdkProperties)[] = Array.isArray(keyOrKeys)
      ? keyOrKeys
      : [keyOrKeys];
    return (onChange: () => void) => {
      const handleSetGlobal = (event: SetGlobalsEvent) => {
        const hasRelevantChange = keys.some(
          (key) => event.detail.globals[key] !== undefined,
        );
        if (!hasRelevantChange) {
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
  }

  public getSnapshot = <K extends keyof AppsSdkProperties>(key: K) => {
    if (window.openai === undefined) {
      throw new Error(
        `window.openai is not available. Make sure you're calling the hook requiring ${key} within the OpenAI iFrame skybridge runtime.`,
      );
    }

    return window.openai[key];
  };
}
