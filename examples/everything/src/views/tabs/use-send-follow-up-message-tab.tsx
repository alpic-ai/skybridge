import { Button } from "@alpic-ai/ui/components/button";
import { Input } from "@alpic-ai/ui/components/input";
import { useState } from "react";
import { useSendFollowUpMessage } from "skybridge/web";
import { Description, TabBody } from "../components/ui.js";

export function UseSendFollowUpMessageTab() {
  const sendFollowUpMessage = useSendFollowUpMessage();
  const [message, setMessage] = useState("Tell me more about this");

  return (
    <TabBody>
      <Description>
        Send a follow-up message to continue the conversation.
      </Description>

      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (message.trim()) {
            sendFollowUpMessage(message);
            setMessage("");
          }
        }}
      >
        <div className="max-w-80 flex-1">
          <Input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter message"
          />
        </div>
        <Button type="submit" disabled={!message.trim()}>
          Send
        </Button>
      </form>
    </TabBody>
  );
}
