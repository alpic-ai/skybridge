import { createElement, StrictMode } from "react";
import { createRoot } from "react-dom/client";

export const mountWidget = (component: React.ReactNode) => {
  const root = document.getElementById("root");
  if (!root) {
    throw new Error("Root element not found");
  }
  createRoot(root).render(createElement(StrictMode, null, component));
};
