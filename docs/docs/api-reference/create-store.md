---
sidebar_position: 1
---

# createStore

The `createStore` function creates a [Zustand](https://github.com/pmndrs/zustand) store that automatically syncs with the widget's persistent state. Unlike `useWidgetState`, this provides a full Zustand store with actions and middleware support, making it ideal for complex state management scenarios.

## Basic usage

```tsx
import { createStore } from "skybridge/web";
import type { StateCreator } from "zustand";

type CounterState = {
  count: number;
  increment: () => void;
  decrement: () => void;
};

const useCounterStore = createStore<CounterState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
}));

function CounterWidget() {
  const count = useCounterStore((state) => state.count);
  const increment = useCounterStore((state) => state.increment);
  const decrement = useCounterStore((state) => state.decrement);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>Increment</button>
      <button onClick={decrement}>Decrement</button>
    </div>
  );
}
```

## Parameters

### `storeCreator`

```tsx
storeCreator: StateCreator<State, [], [], State>;
```

A Zustand state creator function that defines your store's initial state and actions. This follows the standard Zustand pattern.

### `defaultState`

```tsx
defaultState?: State | (() => State)
```

Optional default state to use if no persisted state exists. Can be:

- A value of type `State`
- A function that returns `State` (lazy initialization)

If `window.openai.widgetState` exists, it will take precedence over `defaultState`.

## Returns

```tsx
UseBoundStore<StoreApi<State>>;
```

A Zustand store that can be used with the standard Zustand hooks:

- `store.getState()` - Get the current state
- `store.setState()` - Update the state
- `store.subscribe()` - Subscribe to state changes
- `useStore(selector)` - React hook to access the store

## Features

### Automatic State Persistence

State changes are automatically persisted to `window.openai.setWidgetState`. The state is serialized (functions are stripped) before persistence.

### State Initialization Priority

The store initializes state in the following order:

1. `window.openai.widgetState` (if available) - highest priority
2. `defaultState` parameter (if provided)
3. State returned by `storeCreator`

## Examples

### Todo List with Actions

```tsx
import { createStore } from "skybridge/web";
import type { StateCreator } from "zustand";

type Todo = {
  id: string;
  text: string;
  completed: boolean;
};

type TodoState = {
  todos: Todo[];
  addTodo: (text: string) => void;
  toggleTodo: (id: string) => void;
  removeTodo: (id: string) => void;
  clearCompleted: () => void;
};

const useTodoStore = createStore<TodoState>((set) => ({
  todos: [],
  addTodo: (text) =>
    set((state) => ({
      todos: [
        ...state.todos,
        { id: crypto.randomUUID(), text, completed: false },
      ],
    })),
  toggleTodo: (id) =>
    set((state) => ({
      todos: state.todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      ),
    })),
  removeTodo: (id) =>
    set((state) => ({
      todos: state.todos.filter((todo) => todo.id !== id),
    })),
  clearCompleted: () =>
    set((state) => ({
      todos: state.todos.filter((todo) => !todo.completed),
    })),
}));

function TodoWidget() {
  const todos = useTodoStore((state) => state.todos);
  const addTodo = useTodoStore((state) => state.addTodo);
  const toggleTodo = useTodoStore((state) => state.toggleTodo);
  const removeTodo = useTodoStore((state) => state.removeTodo);
  const clearCompleted = useTodoStore((state) => state.clearCompleted);
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      addTodo(input.trim());
      setInput("");
    }
  };

  return (
    <div className="todo-widget">
      <h3>Todo List</h3>
      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add a todo..."
        />
        <button type="submit">Add</button>
      </form>
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo.id)}
            />
            <span
              style={{
                textDecoration: todo.completed ? "line-through" : "none",
              }}
            >
              {todo.text}
            </span>
            <button onClick={() => removeTodo(todo.id)}>Remove</button>
          </li>
        ))}
      </ul>
      <button onClick={clearCompleted}>Clear Completed</button>
    </div>
  );
}
```

## Comparison with `useWidgetState`

| Feature         | `createStore`                 | `useWidgetState`            |
| --------------- | ----------------------------- | --------------------------- |
| **Type**        | Zustand store                 | React hook                  |
| **Use Case**    | Complex state with actions    | Simple state updates        |
| **Actions**     | ✅ Supported                  | ❌ Not supported            |
| **Middleware**  | ✅ Can be composed            | ❌ Not supported            |
| **Selectors**   | ✅ Full Zustand selectors     | ❌ Returns full state       |
| **Performance** | ✅ Fine-grained subscriptions | ⚠️ Re-renders on any change |
| **API**         | Zustand API                   | React `useState`-like API   |

Use `createStore` when you need:

- Actions and methods on your state
- Complex state logic
- Fine-grained subscriptions
- Zustand middleware support

Use `useWidgetState` when you need:

- Simple state management
- React `useState`-like API
- Quick setup without Zustand knowledge
