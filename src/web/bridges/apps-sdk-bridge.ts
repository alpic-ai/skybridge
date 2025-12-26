import {
  type OpenAiProperties,
  SET_GLOBALS_EVENT_TYPE,
  type SetGlobalsEvent,
} from "../types.js";

export class AppsSdkBridge {
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
