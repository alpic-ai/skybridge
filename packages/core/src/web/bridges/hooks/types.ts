import type { BridgeInterface } from "../types.js";

export type BridgeExternalStore<K extends keyof BridgeInterface> = {
  subscribe: (onChange: () => void) => () => void;
  getSnapshot: () => BridgeInterface[K];
};
