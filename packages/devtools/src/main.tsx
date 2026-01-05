import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// biome-ignore lint/correctness/useImportExtensions: CSS imports must keep .css extension for bundler
import "./index.css";
import App from "./App.js";

// biome-ignore lint: This is default vite entry point
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
