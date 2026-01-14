---
sidebar_position: 4
title: Communicating with the Model
---

# Communicating with the Model

Two channels: passive context sync via `data-llm`, active messages via `useSendFollowUpMessage`.

## Context Sync with data-llm

Describe what the user is seeing so the model understands questions like "Is this one available?":

```tsx
<div data-llm={selectedProduct
  ? `User viewing: ${selectedProduct.name} - $${selectedProduct.price}`
  : "User browsing product list"
}>
  {/* product list */}
</div>
```

See [LLM Context Sync](/concepts/llm-context-sync) for details on nesting, best practices, and limitations.

## Sending Messages with useSendFollowUpMessage

Let the user ask questions through the widget:

```tsx
import { useSendFollowUpMessage } from "skybridge/web";

function FlightWidget() {
  const sendMessage = useSendFollowUpMessage();
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);

  const askAboutBaggage = () => {
    if (!selectedFlight) return;
    sendMessage({
      prompt: `What's the baggage policy for ${selectedFlight.airline}?`
    });
  };

  const bookFlight = () => {
    if (!selectedFlight) return;
    sendMessage({
      prompt: `I'd like to book ${selectedFlight.name}. Please proceed with the booking.`
    });
  };

  return (
    <div>
      {selectedFlight && (
        <div>
          <h2>{selectedFlight.name}</h2>
          <button onClick={askAboutBaggage}>Ask about baggage</button>
          <button onClick={bookFlight}>Book this flight</button>
        </div>
      )}
    </div>
  );
}
```

The message appears in the conversation as if the user typed it, and ChatGPT responds naturally.

### Use Cases

**Quick questions:**
```tsx
<button onClick={() => sendMessage({ prompt: "What are the return policy terms?" })}>
  Ask about returns
</button>
```

**Guided actions:**
```tsx
<button onClick={() => sendMessage({
  prompt: `Add ${selectedItem.name} to my order and confirm the total.`
})}>
  Add to Order
</button>
```

**Help requests:**
```tsx
<button onClick={() => sendMessage({
  prompt: "I'm having trouble completing checkout. Can you help?"
})}>
  Get Help
</button>
```

## Tips

- **Be specific**: Include relevant details in prompts (item name, current step, etc.)
- **Let data-llm provide context**: If data-llm says "User viewing: Nike Air Max", you can just ask "Is this available in size 10?" without repeating the product name

## Related

- [LLM Context Sync concept](/concepts/llm-context-sync)
- [data-llm API](/api-reference/utilities/data-llm)
- [useSendFollowUpMessage API](/api-reference/hooks/use-send-follow-up-message)
