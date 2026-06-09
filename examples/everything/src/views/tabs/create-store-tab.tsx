import { Button } from "@alpic-ai/ui/components/button";
import { Minus, Plus } from "lucide-react";
import { createStore } from "skybridge/web";
import { Code, Description, TabBody } from "../components/ui.js";

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
    <TabBody>
      <Description>
        A{" "}
        <a
          href="https://github.com/pmndrs/zustand"
          className="text-primary underline underline-offset-4"
        >
          Zustand
        </a>{" "}
        store that auto-syncs with the host. State persists across re-renders
        and is restored when the widget reloads.
      </Description>

      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          size="icon"
          aria-label="Decrement"
          onClick={decrement}
        >
          <Minus />
        </Button>
        <Code className="min-w-10 text-center type-text-base">{count}</Code>
        <Button
          variant="secondary"
          size="icon"
          aria-label="Increment"
          onClick={increment}
        >
          <Plus />
        </Button>
      </div>
    </TabBody>
  );
}
