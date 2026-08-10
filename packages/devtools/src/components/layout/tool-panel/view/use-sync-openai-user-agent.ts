import { type RefObject, useEffect } from "react";
import type { AppsSdkContext } from "skybridge/web";

type UseSyncOpenaiUserAgentParams = {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  toolName: string;
  userAgent: AppsSdkContext["userAgent"];
  updateOpenaiObject: (
    toolName: string,
    key: keyof AppsSdkContext,
    value: unknown,
  ) => void;
};

export const useSyncOpenaiUserAgent = ({
  iframeRef,
  toolName,
  userAgent,
  updateOpenaiObject,
}: UseSyncOpenaiUserAgentParams) => {
  useEffect(() => {
    const window = iframeRef.current?.contentWindow as
      | (Window & { openai?: AppsSdkContext })
      | null;
    if (!window?.openai) {
      return;
    }

    window.openai.userAgent = userAgent;
    updateOpenaiObject(toolName, "userAgent", userAgent);
  }, [iframeRef, userAgent, toolName, updateOpenaiObject]);
};
