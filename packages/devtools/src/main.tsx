import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.js";
import { useAuthStore } from "./lib/auth-store.js";
import { connectToServer, finishOAuthCallback } from "./lib/mcp/index.js";

async function init() {
  const params = new URLSearchParams(window.location.search);

  if (params.get("oauth_callback") === "true") {
    const code = params.get("code");
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete("oauth_callback");
    cleanUrl.searchParams.delete("code");
    cleanUrl.searchParams.delete("state");
    window.history.replaceState({}, "", cleanUrl.toString());

    if (code) {
      try {
        await finishOAuthCallback(code);
      } catch (e) {
        console.error("OAuth callback failed:", e);
        useAuthStore.getState().setStatus("error");
        useAuthStore
          .getState()
          .setError(e instanceof Error ? e.message : "OAuth callback failed");
      }
    } else {
      useAuthStore.getState().setStatus("error");
      useAuthStore
        .getState()
        .setError("OAuth callback missing authorization code");
    }
  } else {
    connectToServer().catch((e) => {
      console.error("Connection failed:", e);
    });
  }
}

init();

// biome-ignore lint: This is default vite entry point
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
