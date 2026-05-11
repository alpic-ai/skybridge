import { type RefObject, useEffect } from "react";
import type { AppsSdkContext, Theme } from "skybridge/web";

type UseSyncOpenaiThemeParams = {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  toolName: string;
  theme: Theme;
  updateOpenaiObject: (
    toolName: string,
    key: keyof AppsSdkContext,
    value: unknown,
  ) => void;
};

export const useSyncOpenaiTheme = ({
  iframeRef,
  toolName,
  theme,
  updateOpenaiObject,
}: UseSyncOpenaiThemeParams) => {
  useEffect(() => {
    const window = iframeRef.current?.contentWindow as
      | (Window & { openai?: AppsSdkContext })
      | null;
    if (!window?.openai) {
      return;
    }

    window.openai.theme = theme;
    updateOpenaiObject(toolName, "theme", theme);
  }, [iframeRef, theme, toolName, updateOpenaiObject]);
};
