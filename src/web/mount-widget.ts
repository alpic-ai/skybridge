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

  rootInstance.render(createElement(StrictMode, null, component));
};
