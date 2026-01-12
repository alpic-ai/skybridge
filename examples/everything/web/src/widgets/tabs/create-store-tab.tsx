import { createStore } from "skybridge/web";

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

export function CreateStoreTab() {
  const count = useCounterStore((state) => state.count);
  const increment = useCounterStore((state) => state.increment);
  const decrement = useCounterStore((state) => state.decrement);

  return (
    <div className="tab-content">
      <p className="description">
        A <a href="https://github.com/pmndrs/zustand">Zustand</a> store that
        auto-syncs with the host. State persists across re-renders and is
        restored when the widget reloads.
      </p>

      <div className="button-row">
        <button type="button" className="btn" onClick={decrement}>
          -
        </button>
        <code>{count}</code>
        <button type="button" className="btn" onClick={increment}>
          +
        </button>
      </div>
    </div>
  );
}
