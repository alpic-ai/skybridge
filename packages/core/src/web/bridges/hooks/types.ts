import type { BridgeInterface } from "../types.js";

export type BridgeSubscribe = (onChange: () => void) => () => void;

export type BridgeExternalStore<K extends keyof BridgeInterface> = {
  subscribe: BridgeSubscribe;
  getSnapshot: () => BridgeInterface[K];
};
