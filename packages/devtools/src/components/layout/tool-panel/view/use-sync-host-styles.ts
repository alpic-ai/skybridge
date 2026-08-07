import { type RefObject, useEffect } from "react";
import type { Theme } from "skybridge/web";
import type { PreviewClient } from "@/lib/inspector-preferences-store.js";
import { chatgptStyleVariables } from "./chatgpt-host-context.js";
import { claudeFontsCss, claudeStyleVariables } from "./claude-host-context.js";

const FONTS_STYLE_ID = "__host-fonts";

type UseSyncHostStylesParams = {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  theme: Theme;
  previewClient: PreviewClient | null;
  documentKey: string;
};

export const useSyncHostStyles = ({
  iframeRef,
  theme,
  previewClient,
  documentKey,
}: UseSyncHostStylesParams) => {
  useEffect(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    const root = doc?.documentElement;
    if (!iframe || !doc || !root || !documentKey || previewClient === null) {
      return;
    }

    iframe.style.colorScheme = theme;
    root.style.colorScheme = theme;
    const variables =
      previewClient === "chatgpt"
        ? chatgptStyleVariables(theme)
        : claudeStyleVariables;
    const applied = Object.entries(variables);
    for (const [name, value] of applied) {
      root.style.setProperty(name, value);
    }
    if (previewClient === "claude" && !doc.getElementById(FONTS_STYLE_ID)) {
      const style = doc.createElement("style");
      style.id = FONTS_STYLE_ID;
      style.textContent = claudeFontsCss;
      doc.head?.appendChild(style);
    }

    return () => {
      iframe.style.removeProperty("color-scheme");
      root.style.removeProperty("color-scheme");
      for (const [name] of applied) {
        root.style.removeProperty(name);
      }
    };
  }, [iframeRef, theme, previewClient, documentKey]);
};
