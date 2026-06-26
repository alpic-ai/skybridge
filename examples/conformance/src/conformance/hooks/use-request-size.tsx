import { Button } from "@alpic-ai/ui/components/button";
import { useRequestSize } from "skybridge/web";
import { useManualRun, useRuntime } from "../context.js";
import type { HookDef } from "../types.js";

function RequestSize() {
  const runtime = useRuntime();
  const requestSize = useRequestSize();
  const { run, busy } = useManualRun(async () => {
    await requestSize({ height: 640 });
    return runtime === "apps-sdk"
      ? {
          support: "unsupported" as const,
          detail: "no-op on Apps SDK as documented",
        }
      : {
          support: "supported" as const,
          detail: "requested resize to 640px (host-driven)",
        };
  });
  return (
    <Button loading={busy} onClick={run}>
      Request resize
    </Button>
  );
}

export const useRequestSizeHook: HookDef = {
  name: "useRequestSize",
  source: "skybridge/web",
  docPath: "use-request-size",
  summary: "Ask the host to resize the view iframe (MCP Apps only).",
  members: [
    {
      id: "useRequestSize.request",
      name: "requestSize",
      description:
        "Ask the host to resize the view iframe. MCP Apps performs the resize; Apps SDK is a documented no-op that still resolves.",
      kind: "manual",
      Test: RequestSize,
    },
  ],
};
