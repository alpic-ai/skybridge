/// <reference types="vite/client" />

import { createElement, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { installOpenAILoggingProxy } from "./proxy.js";

let rootInstance: Root | null = null;

export const mountWidget = (component: React.ReactNode) => {
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

  const hostType = window.skybridge?.hostType;

  (async () => {
    let app = component;
    if (hostType === "mcp-app") {
      const { ModalProvider } = await import("./components/modal-provider.js");
      app = createElement(ModalProvider, null, component);
    }
    rootInstance.render(createElement(StrictMode, null, app));
  })();
};
