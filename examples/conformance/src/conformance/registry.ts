import { createStoreHook } from "./hooks/create-store.js";
import { useAppsSdkContextHook } from "./hooks/use-apps-sdk-context.js";
import { useCallToolHook } from "./hooks/use-call-tool.js";
import { useDisplayModeHook } from "./hooks/use-display-mode.js";
import { useDownloadHook } from "./hooks/use-download.js";
import { useFilesHook } from "./hooks/use-files.js";
import { useHostContextHook } from "./hooks/use-host-context.js";
import { useLayoutHook } from "./hooks/use-layout.js";
import { useMcpAppContextHook } from "./hooks/use-mcp-app-context.js";
import { useOpenExternalHook } from "./hooks/use-open-external.js";
import { useRegisterViewToolHook } from "./hooks/use-register-view-tool.js";
import { useRequestCloseHook } from "./hooks/use-request-close.js";
import { useRequestModalHook } from "./hooks/use-request-modal.js";
import { useRequestSizeHook } from "./hooks/use-request-size.js";
import { useSendFollowUpMessageHook } from "./hooks/use-send-follow-up-message.js";
import { useSetOpenInAppUrlHook } from "./hooks/use-set-open-in-app-url.js";
import { useToolInfoHook } from "./hooks/use-tool-info.js";
import { useUserHook } from "./hooks/use-user.js";
import { useViewStateHook } from "./hooks/use-view-state.js";
import type { HookDef } from "./types.js";

/** Every web hook under test, in display order. */
export const HOOKS: HookDef[] = [
  useToolInfoHook,
  useCallToolHook,
  useViewStateHook,
  createStoreHook,
  useLayoutHook,
  useUserHook,
  useDisplayModeHook,
  useRequestModalHook,
  useSendFollowUpMessageHook,
  useFilesHook,
  useDownloadHook,
  useOpenExternalHook,
  useRequestSizeHook,
  useRequestCloseHook,
  useSetOpenInAppUrlHook,
  useRegisterViewToolHook,
  useHostContextHook,
  useAppsSdkContextHook,
  useMcpAppContextHook,
];
