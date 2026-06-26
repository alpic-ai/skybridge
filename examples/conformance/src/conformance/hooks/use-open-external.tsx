import { Button } from "@alpic-ai/ui/components/button";
import { useOpenExternal } from "skybridge/web";
import { useManualRun } from "../context.js";
import type { HookDef } from "../types.js";

function OpenExternal() {
  const openExternal = useOpenExternal();
  const { run, busy } = useManualRun(() => {
    openExternal("https://docs.skybridge.tech");
    return {
      support: "supported" as const,
      detail: "open request dispatched — confirm it opened outside the iframe",
    };
  });
  return (
    <Button loading={busy} onClick={run}>
      Open external link
    </Button>
  );
}

function OpenExternalRedirectUrl() {
  const openExternal = useOpenExternal();
  const { run, busy } = useManualRun(() => {
    openExternal("https://github.com/alpic-ai/skybridge", {
      redirectUrl: false,
    });
    return {
      support: "supported" as const,
      detail:
        "dispatched without the host redirect param (Apps SDK honors redirectUrl:false; MCP Apps ignores it)",
    };
  });
  return (
    <Button loading={busy} onClick={run}>
      Open without redirect param
    </Button>
  );
}

export const useOpenExternalHook: HookDef = {
  name: "useOpenExternal",
  source: "skybridge/web",
  docPath: "use-open-external",
  summary: "Open URLs outside the view iframe.",
  members: [
    {
      id: "useOpenExternal.open",
      name: "openExternal",
      description:
        "Ask the host to open an allowlisted URL outside the view iframe.",
      kind: "manual",
      Test: OpenExternal,
    },
    {
      id: "useOpenExternal.redirectUrl",
      name: "openExternal(redirectUrl:false)",
      description:
        "Open a URL while suppressing the host's redirect wrapper param.",
      kind: "manual",
      Test: OpenExternalRedirectUrl,
    },
  ],
};
