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
    const iss = params.get("iss") ?? undefined;
    const state = params.get("state") ?? undefined;
    const oauthError = params.get("error");
    const oauthErrorDescription = params.get("error_description");
    const cleanUrl = new URL(window.location.href);
    for (const key of [
      "oauth_callback",
      "code",
      "state",
      "iss",
      "error",
      "error_description",
      "error_uri",
    ]) {
      cleanUrl.searchParams.delete(key);
    }
    window.history.replaceState({}, "", cleanUrl.toString());

    if (oauthError) {
      useAuthStore.getState().setStatus("error");
      useAuthStore
        .getState()
        .setError(
          oauthErrorDescription
            ? `${oauthError}: ${oauthErrorDescription}`
            : oauthError,
        );
    } else if (code) {
      try {
        await finishOAuthCallback(code, iss, state);
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
