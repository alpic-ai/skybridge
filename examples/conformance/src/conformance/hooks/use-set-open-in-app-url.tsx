import { useSetOpenInAppUrl } from "skybridge/web";
import { errMessage, useAsyncAuto, useRuntime } from "../context.js";
import type { HookDef } from "../types.js";

function SetOpenInAppUrl() {
  const runtime = useRuntime();
  const setOpenInAppUrl = useSetOpenInAppUrl();
  useAsyncAuto(async () => {
    try {
      await setOpenInAppUrl(
        "https://docs.skybridge.tech/api-reference/use-set-open-in-app-url",
      );
      return runtime === "apps-sdk"
        ? { support: "supported" as const, detail: "set the open-in-app URL" }
        : {
            support: "error" as const,
            detail: "resolved on MCP Apps, expected a throw",
          };
    } catch (e) {
      return runtime === "mcp-app"
        ? {
            support: "unsupported" as const,
            detail: "throws on MCP Apps as documented",
          }
        : { support: "error" as const, detail: errMessage(e) };
    }
  });
  return null;
}

export const useSetOpenInAppUrlHook: HookDef = {
  name: "useSetOpenInAppUrl",
  source: "skybridge/web",
  docPath: "use-set-open-in-app-url",
  summary: "Override the fullscreen open-in-app URL (Apps SDK only).",
  members: [
    {
      id: "useSetOpenInAppUrl.set",
      name: "setOpenInAppUrl",
      description:
        "Set the fullscreen open-in-app URL. Apps SDK accepts it (no visible effect); MCP Apps throws as documented.",
      kind: "auto",
      Test: SetOpenInAppUrl,
    },
  ],
};
