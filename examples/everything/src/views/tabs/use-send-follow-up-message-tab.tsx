import { useState } from "react";
import { useSendFollowUpMessage } from "skybridge/web";

export function UseSendFollowUpMessageTab() {
  const sendFollowUpMessage = useSendFollowUpMessage();
  const [message, setMessage] = useState("Tell me more about this");

  return (
    <div className="tab-content">
      <p className="description">
        Send a follow-up message to continue the conversation.
      </p>

      <form
        className="button-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (message.trim()) {
            sendFollowUpMessage(message);
            setMessage("");
          }
        }}
      >
        <input
          type="text"
          className="input"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter message"
          style={{ flex: 1, maxWidth: "20rem" }}
        />
        <button type="submit" className="btn" disabled={!message.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
