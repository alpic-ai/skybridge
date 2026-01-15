/// <reference types="vite/client" />

import { createElement, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ModalProvider } from "./components/modal-provider.js";
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
  const app =
    hostType === "mcp-app"
      ? createElement(ModalProvider, null, component)
      : component;

  rootInstance.render(createElement(StrictMode, null, app));
};
