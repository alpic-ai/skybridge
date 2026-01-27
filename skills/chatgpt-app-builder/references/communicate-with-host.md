# Communicate with the host

- Create, read, update, and share state → `useWidgetState`
- Share UI state with the LLM → `data-llm`
- Prompt the model → `useSendFollowUpMessage`

## Manage widget state

React-like state persisted by the host across re-renders.

- `useWidgetState`: simple state (single value, small object)
- `createStore`: state shared across components, or with multiple mutation actions

**useWidgetState example:**
```tsx
function SeatPicker() {
  const [state, setState] = useWidgetState({ selectedSeat: null });

  return (
    <button onClick={() => setState({ selectedSeat: "12A" })}>
      Select Seat 12A
    </button>
  );
}
```

**createStore example** (multiple actions, shared across components):

```tsx
import { createStore } from "skybridge/web";

type CartState = {
  items: Flight[];
  addFlight: (flight: Flight) => void;
  removeFlight: (id: string) => void;
};

const useCartStore = createStore<CartState>((set) => ({
  items: [],
  addFlight: (flight) => set((s) => ({ items: [...s.items, flight] })),
  removeFlight: (id) => set((s) => ({ items: s.items.filter((f) => f.id !== id) })),
}));

function FlightCart() {
  const items = useCartStore((s) => s.items);
  const removeFlight = useCartStore((s) => s.removeFlight);

  return (
    <ul>
      {items.map((flight) => (
        <li key={flight.id}>
          {flight.name}
          <button onClick={() => removeFlight(flight.id)}>Remove</button>
        </li>
      ))}
    </ul>
  );
}
```

## Share UI state

Expose UI state to the model via the `data-llm` attribute. Can be nested.

**Example:**
```tsx
<div data-llm="Shopping cart">
  {items.map(item => (
    <div key={item.id} data-llm={`${item.name}: ${item.quantity}x $${item.price}`}>
      {item.name}
    </div>
  ))}
  <div data-llm={`Total: $${total}`}>Total: ${total}</div>
</div>
```

## Prompt model
Trigger an LLM completion from user interaction.

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
