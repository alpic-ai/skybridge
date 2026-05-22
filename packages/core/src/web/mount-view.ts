/// <reference types="vite/client" />

import { createElement, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { installOpenAILoggingProxy } from "./proxy.js";

let rootInstance: Root | null = null;

/**
 * Mount a view's root React component into `#root`. Each view file's entry
 * point should call this exactly once.
 *
 * Wraps the component in `StrictMode`, applies host-specific providers
 * automatically (e.g. modal support for MCP Apps), and installs the dev-mode
 * logging proxy for `window.openai` calls.
 *
 * @param component - Your root React element (already constructed, e.g. `<App />`).
 *
 * @example
 * ```tsx
 * // src/views/search.tsx
 * import { mountView } from "skybridge/web";
 * import { App } from "./App";
 *
 * mountView(<App />);
 * ```
 */
export const mountView = (component: React.ReactNode) => {
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
