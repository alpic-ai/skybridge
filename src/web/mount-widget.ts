/// <reference types="vite/client" />

import { createElement, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { installOpenAILoggingProxy } from "./proxy.js";

let rootInstance: Root | null = null;

const waitForOpenAI = (): Promise<undefined> => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("window is not available"));
      return;
    }

    if ("openai" in window && window.openai != null) {
      resolve(undefined);
      return;
    }

    Object.defineProperty(window, "openai", {
      configurable: true,
      enumerable: true,
      get() {
        return undefined;
      },
      set(value) {
        Object.defineProperty(window, "openai", {
          configurable: true,
          enumerable: true,
          writable: true,
          value,
        });
        resolve(undefined);
      },
    });
  });
};

export const mountWidget = async (component: React.ReactNode) => {
  await waitForOpenAI();

  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found");
  }

  if (!rootInstance) {
    rootInstance = createRoot(rootElement);
  }

  if (import.meta.env.DEV) {
    installOpenAILoggingProxy();
  }

  rootInstance.render(createElement(StrictMode, null, component));
};
