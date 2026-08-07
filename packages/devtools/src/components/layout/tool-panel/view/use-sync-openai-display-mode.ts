import { type RefObject, useEffect } from "react";
import type { AppsSdkContext, DisplayMode } from "skybridge/web";

type UseSyncOpenaiDisplayModeParams = {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  toolName: string;
  displayMode: DisplayMode;
  updateOpenaiObject: (
    toolName: string,
    key: keyof AppsSdkContext,
    value: unknown,
  ) => void;
};

export const useSyncOpenaiDisplayMode = ({
  iframeRef,
  toolName,
  displayMode,
  updateOpenaiObject,
}: UseSyncOpenaiDisplayModeParams) => {
  useEffect(() => {
    const window = iframeRef.current?.contentWindow as
      | (Window & { openai?: AppsSdkContext })
      | null;
    if (!window?.openai || window.openai.displayMode === displayMode) {
      return;
    }

    window.openai.displayMode = displayMode;
    updateOpenaiObject(toolName, "displayMode", displayMode);
  }, [iframeRef, displayMode, toolName, updateOpenaiObject]);
};
