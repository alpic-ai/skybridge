import { createElement, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";

let rootInstance: Root | null = null;

export const mountWidget = (component: React.ReactNode) => {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found");
  }

  if (!rootInstance) {
    rootInstance = createRoot(rootElement);
  }

  rootInstance.render(createElement(StrictMode, null, component));
};
