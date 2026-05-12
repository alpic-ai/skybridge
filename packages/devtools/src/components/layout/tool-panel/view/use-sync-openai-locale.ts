import { type RefObject, useEffect } from "react";
import type { AppsSdkContext } from "skybridge/web";

type UseSyncOpenaiLocaleParams = {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  toolName: string;
  locale: string;
  updateOpenaiObject: (
    toolName: string,
    key: keyof AppsSdkContext,
    value: unknown,
  ) => void;
};

export const useSyncOpenaiLocale = ({
  iframeRef,
  toolName,
  locale,
  updateOpenaiObject,
}: UseSyncOpenaiLocaleParams) => {
  useEffect(() => {
    const window = iframeRef.current?.contentWindow as
      | (Window & { openai?: AppsSdkContext })
      | null;
    if (!window?.openai) {
      return;
    }

    window.openai.locale = locale;
    updateOpenaiObject(toolName, "locale", locale);
  }, [iframeRef, locale, toolName, updateOpenaiObject]);
};
