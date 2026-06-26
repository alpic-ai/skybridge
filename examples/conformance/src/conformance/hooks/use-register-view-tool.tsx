import { Button } from "@alpic-ai/ui/components/button";
import { useRegisterViewTool, useSendFollowUpMessage } from "skybridge/web";
import { z } from "zod";
import { Code, Description, Stack } from "@/views/components/ui.js";
import {
  useAutoReport,
  useConformance,
  useManualRun,
  useRuntime,
} from "../context.js";
import type { HookDef } from "../types.js";

const TOOL_NAME = "conformance_view_echo";
const PROBE_MESSAGE = "conformance-roundtrip";
const INVOKE_ID = "useRegisterViewTool.invoke";

/**
 * Keeps `conformance_view_echo` registered for the whole session (auto +
 * persistent), so the host can discover and invoke it. Reports the `register`
 * status, and — when the host actually invokes the tool — reports the `invoke`
 * member's result from the live handler (which keeps working even after the
 * invoke step has scrolled out of the stepper).
 */
function RegisterMember() {
  const runtime = useRuntime();
  const { report } = useConformance();

  useRegisterViewTool(
    {
      name: TOOL_NAME,
      description:
        "Echo a message back from the conformance view (conformance check).",
      inputSchema: { message: z.string() },
      annotations: { readOnlyHint: true },
    },
    ({ message }) => {
      // The host invoked the registered view tool — the round-trip works.
      report(INVOKE_ID, {
        support: "supported",
        detail: `host invoked ${TOOL_NAME} with message="${message}"`,
      });
      return {
        content: [{ type: "text", text: `view echoed: ${message}` }],
        structuredContent: { message },
        isError: false,
      };
    },
  );

  useAutoReport(
    runtime === "mcp-app"
      ? {
          support: "supported",
          detail: `registered ${TOOL_NAME}; the host can discover and invoke it`,
        }
      : {
          support: "unsupported",
          detail: "useRegisterViewTool is a no-op on Apps SDK",
        },
  );

  return null;
}

/**
 * Proves the registered tool is actually callable: asks the model (via a
 * follow-up message) to invoke it. The result is reported by RegisterMember's
 * live handler when the host calls the tool.
 */
function InvokeMember() {
  const runtime = useRuntime();
  const send = useSendFollowUpMessage();
  const { run, busy } = useManualRun(async () => {
    if (runtime !== "mcp-app") {
      return {
        support: "unsupported" as const,
        detail:
          "view tools are only registered on MCP Apps, so there is nothing to invoke",
      };
    }
    await send(
      `Call the ${TOOL_NAME} tool with the message "${PROBE_MESSAGE}".`,
    );
    return {
      support: "untested" as const,
      detail: `asked the model to call ${TOOL_NAME} — waiting for the host to invoke it`,
    };
  });

  return (
    <Stack>
      <Description>
        Sends a follow-up message asking the model to call the registered{" "}
        <Code>{TOOL_NAME}</Code> tool. When the host invokes it, the handler
        runs and this flips to supported.
      </Description>
      <Button loading={busy} onClick={run}>
        Ask the model to call {TOOL_NAME}
      </Button>
    </Stack>
  );
}

export const useRegisterViewToolHook: HookDef = {
  name: "useRegisterViewTool",
  source: "skybridge/web",
  docPath: "use-register-view-tool",
  summary: "Expose a tool that runs inside the view (MCP Apps only).",
  members: [
    {
      id: "useRegisterViewTool.register",
      name: "register",
      description:
        "Registers an app-provided tool the host can discover and invoke; a no-op on Apps SDK.",
      kind: "auto",
      Test: RegisterMember,
    },
    {
      id: INVOKE_ID,
      name: "host invocation",
      description:
        "The host can actually invoke the registered tool — triggered with useSendFollowUpMessage.",
      kind: "manual",
      Test: InvokeMember,
    },
  ],
};
