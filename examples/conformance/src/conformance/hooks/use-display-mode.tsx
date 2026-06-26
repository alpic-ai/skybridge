import { Button } from "@alpic-ai/ui/components/button";
import { useDisplayMode } from "skybridge/web";
import { Code } from "@/views/components/ui.js";
import { errMessage, useAutoReport, useManualRun } from "../context.js";
import type { HookDef, MemberResult } from "../types.js";

const MODES = ["pip", "inline", "fullscreen", "modal"] as const;

function ReadMode() {
  const [mode] = useDisplayMode();
  const known = MODES.includes(mode as (typeof MODES)[number]);
  const result: MemberResult = known
    ? { support: "supported", detail: `mode is "${mode}"` }
    : { support: "unsupported", detail: "not reported by host" };
  useAutoReport(result);
  return <Code>{String(mode)}</Code>;
}

function RequestInline() {
  const [, setMode] = useDisplayMode();
  const { run, busy } = useManualRun(async () => {
    try {
      const { mode } = await setMode("inline");
      return mode === "inline"
        ? { support: "supported" as const, detail: `granted ${mode}` }
        : { support: "unsupported" as const, detail: `host granted ${mode}` };
    } catch (e) {
      return { support: "error" as const, detail: errMessage(e) };
    }
  });
  return (
    <Button loading={busy} onClick={run}>
      Request inline
    </Button>
  );
}

function RequestFullscreen() {
  const [, setMode] = useDisplayMode();
  const { run, busy } = useManualRun(async () => {
    try {
      const { mode } = await setMode("fullscreen");
      return mode === "fullscreen"
        ? { support: "supported" as const, detail: `granted ${mode}` }
        : { support: "unsupported" as const, detail: `host granted ${mode}` };
    } catch (e) {
      return { support: "error" as const, detail: errMessage(e) };
    }
  });
  return (
    <Button loading={busy} onClick={run}>
      Request fullscreen
    </Button>
  );
}

function RequestPip() {
  const [, setMode] = useDisplayMode();
  const { run, busy } = useManualRun(async () => {
    try {
      const { mode } = await setMode("pip");
      return mode === "pip"
        ? { support: "supported" as const, detail: `granted ${mode}` }
        : {
            support: "unsupported" as const,
            detail: `host granted ${mode} (pip is coerced to fullscreen on mobile)`,
          };
    } catch (e) {
      return { support: "error" as const, detail: errMessage(e) };
    }
  });
  return (
    <Button loading={busy} onClick={run}>
      Request pip
    </Button>
  );
}

export const useDisplayModeHook: HookDef = {
  name: "useDisplayMode",
  source: "skybridge/web",
  docPath: "use-display-mode",
  summary: "Read and request inline / pip / fullscreen.",
  members: [
    {
      id: "useDisplayMode.read",
      name: "displayMode",
      description:
        "The current display mode is one of pip, inline, fullscreen or modal.",
      kind: "auto",
      Test: ReadMode,
    },
    {
      id: "useDisplayMode.pip",
      name: "setDisplayMode('pip')",
      description:
        "Request the picture-in-picture display mode; pip is coerced to fullscreen on mobile, so the granted mode may differ.",
      kind: "manual",
      Test: RequestPip,
    },
    {
      id: "useDisplayMode.inline",
      name: "setDisplayMode('inline')",
      description:
        "Request the inline display mode; the host returns the mode it actually applied.",
      kind: "manual",
      Test: RequestInline,
    },
    {
      id: "useDisplayMode.fullscreen",
      name: "setDisplayMode('fullscreen')",
      description:
        "Request the fullscreen display mode; the host returns the mode it actually applied.",
      kind: "manual",
      Test: RequestFullscreen,
    },
  ],
};
