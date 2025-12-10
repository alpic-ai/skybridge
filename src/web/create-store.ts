import { create, type StateCreator } from "zustand";
import {
  getInitialState,
  injectWidgetContext,
  serializeState
} from "./helpers/state.js";
import type { UnknownObject } from "./types.js";

export function createStore<State extends UnknownObject>(
  storeCreator: StateCreator<State, [], [], State>,
  defaultState?: State | (() => State)
) {
  const initialState = getInitialState(defaultState);

  const store = create<State>()(
    (...args: Parameters<StateCreator<State, [], [], State>>) => {
      const baseStore = storeCreator(...args);

      if (initialState !== null) {
        return { ...baseStore, ...initialState };
      }

      return baseStore;
    }
  );

  store.subscribe((state: State) => {
    if (window.openai) {
      const serializedState = serializeState(state);
      if (serializedState !== null && serializedState !== undefined) {
        const stateToPersist = injectWidgetContext(serializedState as State);
        if (stateToPersist !== null) {
          window.openai.setWidgetState(stateToPersist);
        }
      }
    }
  });

  return store;
}
