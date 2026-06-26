import { Button } from "@alpic-ai/ui/components/button";
import { useRequestClose } from "skybridge/web";
import { useManualRun } from "../context.js";
import type { HookDef } from "../types.js";

function RequestClose() {
  const close = useRequestClose();
  const { run, busy } = useManualRun(() => {
    // Do not await: the host may tear down the view on close. Fire the request
    // and record the result synchronously before any unmount happens.
    void close();
    return {
      support: "supported" as const,
      detail: "close requested — the host should dismiss the view",
    };
  });
  return (
    <Button loading={busy} onClick={run}>
      Request close
    </Button>
  );
}

export const useRequestCloseHook: HookDef = {
  name: "useRequestClose",
  source: "skybridge/web",
  docPath: "use-request-close",
  summary: "Ask the host to dismiss (close) the view.",
  members: [
    {
      id: "useRequestClose.close",
      name: "requestClose",
      description:
        "Ask the host to dismiss the view; the view unmounts, so run this last (it is not part of the stepper).",
      kind: "standalone",
      Test: RequestClose,
    },
  ],
};
