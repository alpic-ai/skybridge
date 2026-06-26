import { useHostContext } from "skybridge/web";
import { useAutoReport } from "../context.js";
import type { HookDef } from "../types.js";

function ReadMember() {
  const theme = useHostContext("theme");
  useAutoReport(
    theme === "light" || theme === "dark"
      ? {
          support: "supported",
          detail: `useHostContext('theme') returned "${theme}"`,
        }
      : {
          support: "error",
          detail: `unexpected theme value: ${JSON.stringify(theme)}`,
        },
  );
  return null;
}

export const useHostContextHook: HookDef = {
  name: "useHostContext",
  source: "skybridge/web",
  summary: "Low-level cross-host context reader that backs the typed hooks.",
  members: [
    {
      id: "useHostContext.read",
      name: "read(key)",
      description: "Read a host-context key (theme) directly via the bridge.",
      kind: "auto",
      Test: ReadMember,
    },
  ],
};
