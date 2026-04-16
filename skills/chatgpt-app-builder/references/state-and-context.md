# Manage Widget State and LLM Context

- Widget state (`useWidgetState`/`createStore`) persists and is visible to LLM as structured data.
- `data-llm` gives LLM context for referential language ("this one").
- React `useState` is ephemeral and invisible to LLM.

**Decision guide:**
| Need | Use |
|------|-----|
| Persist data, single component | `useWidgetState` |
| Persist data, shared across components, complex mutations | `createStore` |
| Help LLM understand "this one" | `data-llm` |
| Ephemeral UI only (hover, animation) | `useState` |

## useWidgetState

Single component, simple access patterns.

```tsx
function SeatPicker({ seats }) {
  const [{ selectedSeat }, setState] = useWidgetState({ selectedSeat: null });

  return (
    <div className="seat-grid">
      {seats.map(seat => (
        <button
          key={seat.id}
          onClick={() => setState((prev) => ({ ...prev, selectedSeat: seat.id }))}
          className={selectedSeat === seat.id ? "selected" : ""}
        >
          {seat.id}
        </button>
      ))}
    </div>
  );
}
```

**Why useWidgetState:** Single component reads `selectedSeat` to highlight button. Widget or LLM reads when booking.

## createStore

Shared across components, complex mutations. `createStore` is a thin wrapper around Zustand.

```tsx
import { createStore } from "skybridge/web";

const useCartStore = createStore<CartState>((set) => ({
  cart: [],
  add: (item) => set((s) => ({ cart: [...s.cart, item] })),
  remove: (id) => set((s) => ({ cart: s.cart.filter(i => i.id !== id) })),
}));

// ProductCard.tsx
function ProductCard({ product }) {
  const add = useCartStore((s) => s.add);
  return <button onClick={() => add(product)}>Add to Cart</button>;
}

// CartSummary.tsx
function CartSummary() {
  const cart = useCartStore((s) => s.cart);
  return <span>{cart.length} items</span>;
}
```

**Why createStore:** Cart accessed by multiple components. Widget or LLM reads items at checkout.

## data-llm

Tell the LLM what user is viewing/doing. One-way—widget doesn't read it back. These are annotations—don't put complex objects here.

```tsx
function ProductDetail({ product }) {
  return (
    <div data-llm={`Viewing: ${product.name}, $${product.price}, ${product.inStock ? "in stock" : "out of stock"}`}>
      <h1>{product.name}</h1>
      <p>${product.price}</p>
    </div>
  );
}
```

**Why data-llm:** When user asks "Is this one good?" or "Add this to cart", LLM knows what "this" refers to.

## Common mistakes

```tsx
// DON'T: useState is not persisted, LLM can't see it
const [selected, setSelected] = useState(null);

// DO: useWidgetState persists and LLM sees it
const [{ selected }, setState] = useWidgetState({ selected: null });
```

```tsx
// DON'T: Complex object in data-llm
<div data-llm={JSON.stringify(cart)}>

// DO: Human-readable summary
<div data-llm={`Cart: ${cart.length} items, $${total}`}>
```

## Combined example

Todo list. User checks off tasks, asks "what should I prioritize?"

```tsx
function TaskList() {
  // PERSIST: All tasks with completed status
  const [{ tasks }, setState] = useWidgetState({
    tasks: [
      { id: 1, title: "Buy groceries", completed: false },
      { id: 2, title: "Call mom", completed: true },
    ]
  });

  // EPHEMERAL: Task user is viewing — reset on reopen
  const [viewing, setViewing] = useState(null);

  return (
    // CONTEXT: What user is looking at — LLM answers "how should I handle this task?"
    <div data-llm={viewing
      ? `Viewing: "${viewing.title}"`
      : `${tasks.filter(t => !t.completed).length} tasks remaining`
    }>
      {tasks.map(t => (
        <Task
          key={t.id}
          task={t}
          onView={() => setViewing(t)}
          onToggle={() => setState((prev) => ({
            ...prev,
            tasks: prev.tasks.map(task =>
              task.id === t.id ? { ...task, completed: !task.completed } : task
            )
          }))}
        />
      ))}
    </div>
  );
}
```

**Why each?**

| What | API | Why |
|------|-----|-----|
| `tasks` | `useWidgetState` | Persists. Tasks and progress survive reopen. |
| `viewing` | `useState` | Ephemeral. Current focus resets on reopen. |
| `"Viewing: Buy groceries"` | `data-llm` | LLM context. Understands "this task" in conversation. |
