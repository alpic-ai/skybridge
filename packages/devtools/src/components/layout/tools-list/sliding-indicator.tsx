import { useLayoutEffect, useRef, useState } from "react";

export type SlidingIndicatorState = {
  top: number;
  height: number;
};

export function useSlidingIndicator(selected: string | null) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<SlidingIndicatorState>({
    top: 0,
    height: 0,
  });

  useLayoutEffect(() => {
    const container = ref.current;
    if (!container || !selected) {
      return;
    }
    const target = container.querySelector<HTMLElement>(
      `[data-id="${CSS.escape(selected)}"]`,
    );
    if (!target) {
      return;
    }
    const parentRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    setState({
      top: targetRect.top - parentRect.top + container.scrollTop,
      height: targetRect.height,
    });
  }, [selected]);

  return { ref, state };
}

export function SlidingIndicator({ state }: { state: SlidingIndicatorState }) {
  if (state.height === 0) {
    return null;
  }
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute right-2 left-2 z-0 rounded-md border border-border bg-card shadow-sm"
      style={{
        top: state.top,
        height: state.height,
        transition:
          "top 260ms cubic-bezier(0.4, 0, 0.2, 1), height 260ms cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    />
  );
}
