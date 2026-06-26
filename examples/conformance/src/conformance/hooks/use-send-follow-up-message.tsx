import { Button } from "@alpic-ai/ui/components/button";
import { useSendFollowUpMessage } from "skybridge/web";
import { useManualRun } from "../context.js";
import type { HookDef } from "../types.js";

function SendFollowUpMessage() {
  const send = useSendFollowUpMessage();
  const { run, busy } = useManualRun(async () => {
    await send("This is a Skybridge conformance follow-up message.");
    return {
      support: "supported" as const,
      detail: "message dispatched — confirm a new assistant turn appears",
    };
  });
  return (
    <Button loading={busy} onClick={run}>
      Send follow-up
    </Button>
  );
}

export const useSendFollowUpMessageHook: HookDef = {
  name: "useSendFollowUpMessage",
  source: "skybridge/web",
  docPath: "use-send-follow-up-message",
  summary: "Send a follow-up turn to the model from the view.",
  members: [
    {
      id: "useSendFollowUpMessage.send",
      name: "sendFollowUpMessage",
      description:
        "Dispatch a follow-up prompt to the model; a new assistant turn should appear.",
      kind: "manual",
      Test: SendFollowUpMessage,
    },
  ],
};
