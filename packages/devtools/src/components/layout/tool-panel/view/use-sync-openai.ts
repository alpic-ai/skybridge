import { type RefObject, useEffect } from "react";
import type { AppsSdkContext } from "skybridge/web";

type UseSyncOpenaiParams<K extends keyof AppsSdkContext> = {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  toolName: string;
  globalKey: K;
  value: AppsSdkContext[K];
  updateOpenaiObject: (
    toolName: string,
    key: keyof AppsSdkContext,
    value: unknown,
  ) => void;
};

export const useSyncOpenai = <K extends keyof AppsSdkContext>({
  iframeRef,
  toolName,
  globalKey,
  value,
  updateOpenaiObject,
}: UseSyncOpenaiParams<K>) => {
  useEffect(() => {
    const openai = (
      iframeRef.current?.contentWindow as {
        openai?: AppsSdkContext;
      } | null
    )?.openai;
    if (!openai || openai[globalKey] === value) {
      return;
    }

    openai[globalKey] = value;
    updateOpenaiObject(toolName, globalKey, value);
  }, [iframeRef, globalKey, value, toolName, updateOpenaiObject]);
};
