---
sidebar_position: 15
---

# useWidgetState

The `useWidgetState` hook provides persistent state management for your widget. Unlike React's `useState`, this state is persisted by the host and survives across widget re-renders and display mode changes.

## Basic usage

```tsx
import { useWidgetState } from "skybridge/web";

function CounterWidget() {
  const [state, setState] = useWidgetState({ count: 0 });

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={() => setState((prev) => ({ count: prev.count + 1 }))}>
        Increment
      </button>
    </div>
  );
}
```

## Parameters

### `defaultState`

```tsx
defaultState?: T | (() => T | null) | null
```

The default state to use if no persisted state exists. Can be:

- A value of type `T`
- A function that returns `T` or `null` (lazy initialization)
- `null` or `undefined`

## Type Parameters

### `T`

```tsx
T extends Record<string, unknown>
```

The type of your widget state. Must be a plain object.

## Returns

```tsx
[state: T | null, setState: (state: SetStateAction<T | null>) => void]
```

A tuple containing:

### `state`

The current widget state, or `null` if no state is set.

### `setState`

A function to update the state. Accepts either:

- A new state object
- A function that receives the previous state and returns the new state

## Examples

### Form State Persistence

```tsx
import { useWidgetState } from "skybridge/web";

type FormState = {
  name: string;
  email: string;
  step: number;
};

function MultiStepForm() {
  const [form, setForm] = useWidgetState<FormState>({
    name: "",
    email: "",
    step: 1,
  });

  const updateField = (field: keyof FormState, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  if (form.step === 1) {
    return (
      <div>
        <h3>Step 1: Name</h3>
        <input
          value={form.name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder="Your name"
        />
        <button
          onClick={() => updateField("step", 2)}
          disabled={!form.name}
        >
          Next
        </button>
      </div>
    );
  }

  if (form.step === 2) {
    return (
      <div>
        <h3>Step 2: Email</h3>
        <input
          type="email"
          value={form.email}
          onChange={(e) => updateField("email", e.target.value)}
          placeholder="Your email"
        />
        <button onClick={() => updateField("step", 1)}>Back</button>
        <button
          onClick={() => updateField("step", 3)}
          disabled={!form.email}
        >
          Submit
        </button>
      </div>
    );
  }

  return (
    <div>
      <h3>Thank you, {form.name}!</h3>
      <p>We'll contact you at {form.email}</p>
    </div>
  );
}
```

### Shopping Cart

```tsx
import { useWidgetState } from "skybridge/web";

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type CartState = {
  items: CartItem[];
};

function ShoppingCart() {
  const [cart, setCart] = useWidgetState<CartState>({ items: [] });

  const addItem = (item: Omit<CartItem, "quantity">) => {
    setCart((prev) => {
      const existing = prev.items.find((i) => i.id === item.id);
      if (existing) {
        return {
          items: prev.items.map((i) =>
            i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }
      return { items: [...prev.items, { ...item, quantity: 1 }] };
    });
  };

  const removeItem = (id: string) => {
    setCart((prev) => ({
      items: prev.items.filter((i) => i.id !== id),
    }));
  };

  const total = cart.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <div className="cart">
      <h3>Shopping Cart</h3>
      {cart.items.length === 0 ? (
        <p>Your cart is empty</p>
      ) : (
        <>
          <ul>
            {cart.items.map((item) => (
              <li key={item.id}>
                {item.name} x{item.quantity} - ${item.price * item.quantity}
                <button onClick={() => removeItem(item.id)}>Remove</button>
              </li>
            ))}
          </ul>
          <p className="total">Total: ${total}</p>
        </>
      )}
    </div>
  );
}
```

### User Preferences

```tsx
import { useWidgetState } from "skybridge/web";

type Preferences = {
  fontSize: "small" | "medium" | "large";
  showImages: boolean;
  sortBy: "date" | "name" | "relevance";
};

function PreferencesWidget() {
  const [prefs, setPrefs] = useWidgetState<Preferences>({
    fontSize: "medium",
    showImages: true,
    sortBy: "date",
  });

  return (
    <div className="preferences">
      <h3>Preferences</h3>

      <label>
        Font Size:
        <select
          value={prefs.fontSize}
          onChange={(e) =>
            setPrefs((prev) => ({
              ...prev,
              fontSize: e.target.value as Preferences["fontSize"],
            }))
          }
        >
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
      </label>

      <label>
        <input
          type="checkbox"
          checked={prefs.showImages}
          onChange={(e) =>
            setPrefs((prev) => ({ ...prev, showImages: e.target.checked }))
          }
        />
        Show Images
      </label>

      <label>
        Sort By:
        <select
          value={prefs.sortBy}
          onChange={(e) =>
            setPrefs((prev) => ({
              ...prev,
              sortBy: e.target.value as Preferences["sortBy"],
            }))
          }
        >
          <option value="date">Date</option>
          <option value="name">Name</option>
          <option value="relevance">Relevance</option>
        </select>
      </label>
    </div>
  );
}
```

### Lazy Initialization

```tsx
import { useWidgetState } from "skybridge/web";

type GameState = {
  board: string[][];
  currentPlayer: "X" | "O";
  winner: string | null;
};

function TicTacToe() {
  const [game, setGame] = useWidgetState<GameState>(() => ({
    board: [
      ["", "", ""],
      ["", "", ""],
      ["", "", ""],
    ],
    currentPlayer: "X",
    winner: null,
  }));

  const handleClick = (row: number, col: number) => {
    if (game.board[row][col] || game.winner) return;

    setGame((prev) => {
      const newBoard = prev.board.map((r, i) =>
        r.map((c, j) => (i === row && j === col ? prev.currentPlayer : c))
      );
      return {
        board: newBoard,
        currentPlayer: prev.currentPlayer === "X" ? "O" : "X",
        winner: checkWinner(newBoard),
      };
    });
  };

  const resetGame = () => {
    setGame({
      board: [
        ["", "", ""],
        ["", "", ""],
        ["", "", ""],
      ],
      currentPlayer: "X",
      winner: null,
    });
  };

  return (
    <div className="tic-tac-toe">
      <div className="board">
        {game.board.map((row, i) =>
          row.map((cell, j) => (
            <button
              key={`${i}-${j}`}
              onClick={() => handleClick(i, j)}
              disabled={!!cell || !!game.winner}
            >
              {cell}
            </button>
          ))
        )}
      </div>
      {game.winner ? (
        <p>Winner: {game.winner}!</p>
      ) : (
        <p>Current player: {game.currentPlayer}</p>
      )}
      <button onClick={resetGame}>Reset</button>
    </div>
  );
}
```

### Nullable State

```tsx
import { useWidgetState } from "skybridge/web";

type UserProfile = {
  id: string;
  name: string;
  avatar: string;
};

function ProfileWidget() {
  // State can be null - useful for optional data
  const [profile, setProfile] = useWidgetState<UserProfile>(null);

  if (!profile) {
    return (
      <div>
        <p>No profile set</p>
        <button
          onClick={() =>
            setProfile({
              id: "1",
              name: "John Doe",
              avatar: "/avatars/default.png",
            })
          }
        >
          Create Profile
        </button>
      </div>
    );
  }

  return (
    <div className="profile">
      <img src={profile.avatar} alt={profile.name} />
      <h3>{profile.name}</h3>
      <button onClick={() => setProfile(null)}>Clear Profile</button>
    </div>
  );
}
```

