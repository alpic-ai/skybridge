# Prompt model

Trigger an LLM completion from user interaction with `useSendFollowUpMessage`.

**Example:**
```tsx
import { useSendFollowUpMessage } from "skybridge/web";

export function FindBestFlightButton() {
  const sendMessage = useSendFollowUpMessage();

  return (
    <button onClick={() => sendMessage({
      prompt: "Find the best flight option, based on user preferences and agenda."
    })}>
      Find Best Flight
    </button>
  );
}
```
