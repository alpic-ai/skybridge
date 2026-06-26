import { useCallTool } from "skybridge/web";
import { errMessage, useAsyncAuto } from "../context.js";
import type { HookDef, MemberResult } from "../types.js";

function CallToolAsyncMember() {
  const { callToolAsync } = useCallTool<{ value: string }>("echo");
  useAsyncAuto(async () => {
    const res = await callToolAsync({ value: "conformance" });
    const echo = (res.structuredContent as { echo?: string }).echo;
    return echo === "conformance"
      ? {
          support: "supported" as const,
          detail: "callToolAsync resolved with the echoed structuredContent",
        }
      : {
          support: "error" as const,
          detail: `unexpected response: ${JSON.stringify(res.structuredContent)}`,
        };
  });
  return null;
}

function CallToolMember() {
  const { callTool } = useCallTool("ping");
  useAsyncAuto(
    () =>
      new Promise<MemberResult>((resolve) => {
        callTool({
          onSuccess: () =>
            resolve({
              support: "supported",
              detail: "fire-and-forget callTool ran and onSuccess fired",
            }),
          onError: (e) => resolve({ support: "error", detail: errMessage(e) }),
        });
      }),
  );
  return null;
}

function ErrorStateMember() {
  const { callToolAsync } = useCallTool("definitely-not-a-real-tool");
  useAsyncAuto(async () => {
    try {
      await callToolAsync();
      return {
        support: "error" as const,
        detail: "calling an unknown tool unexpectedly resolved",
      };
    } catch (e) {
      return {
        support: "supported" as const,
        detail: `unknown tool rejected into the error state as expected: ${errMessage(e)}`,
      };
    }
  });
  return null;
}

export const useCallToolHook: HookDef = {
  name: "useCallTool",
  source: "skybridge/web",
  docPath: "use-call-tool",
  summary: "Call server tools from the view and track the call state.",
  members: [
    {
      id: "useCallTool.callToolAsync",
      name: "callToolAsync",
      description: "Await a tool call and read its structuredContent.",
      kind: "auto",
      Test: CallToolAsyncMember,
    },
    {
      id: "useCallTool.callTool",
      name: "callTool + SideEffects",
      description: "Fire-and-forget call with onSuccess / onError callbacks.",
      kind: "auto",
      Test: CallToolMember,
    },
    {
      id: "useCallTool.errorState",
      name: "error state",
      description:
        "A transport failure (unknown tool) reaches the error state.",
      kind: "auto",
      Test: ErrorStateMember,
    },
  ],
};
