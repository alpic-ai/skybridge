import type { Bridge, Subscribe } from "../types.js";
import {
  type AppsSdkContext,
  SET_GLOBALS_EVENT_TYPE,
  type SetGlobalsEvent,
} from "./types.js";

export class AppsSdkBridge implements Bridge<AppsSdkContext> {
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

  public subscribe(key: keyof AppsSdkContext): Subscribe;
  public subscribe(keys: readonly (keyof AppsSdkContext)[]): Subscribe;
  public subscribe(
    keyOrKeys: keyof AppsSdkContext | readonly (keyof AppsSdkContext)[],
  ): Subscribe {
    const keys: readonly (keyof AppsSdkContext)[] = Array.isArray(keyOrKeys)
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

  public getSnapshot = <K extends keyof AppsSdkContext>(key: K) => {
    if (window.openai === undefined) {
      throw new Error(
        `window.openai is not available. Make sure you're calling the hook requiring ${key} within the OpenAI iFrame skybridge runtime.`,
      );
    }

    return window.openai[key];
  };
}
