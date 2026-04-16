import { dequal } from "dequal/lite";
import { create, type StateCreator } from "zustand";
import { getAdaptor } from "./bridges/index.js";
import {
  filterWidgetContext,
  getInitialState,
  injectWidgetContext,
  serializeState,
} from "./helpers/state.js";
import type { UnknownObject } from "./types.js";

export function createStore<State extends UnknownObject>(
  storeCreator: StateCreator<State, [], [], State>,
  defaultState?: State | (() => State),
) {
  const initialState = getInitialState(defaultState);

  const store = create<State>()(
    (...args: Parameters<StateCreator<State, [], [], State>>) => {
      const baseStore = storeCreator(...args);

      if (initialState !== null) {
        return { ...baseStore, ...initialState };
      }

      return baseStore;
    },
  );

  // Bidirectional sync between the Zustand store and the adaptor's widgetState.
  // Store changes persist to the host; external widgetState changes rehydrate the store.
  store.subscribe((state: State) => {
    const serializedState = serializeState(state);
    if (serializedState !== null && serializedState !== undefined) {
      const stateToPersist = injectWidgetContext(serializedState as State);
      if (stateToPersist !== null) {
        getAdaptor().setWidgetState(stateToPersist);
      }
    }
  });

  const widgetStateStore = getAdaptor().getHostContextStore("widgetState");
  widgetStateStore.subscribe(() => {
    const externalState = widgetStateStore.getSnapshot();
    if (externalState !== null) {
      const filtered = filterWidgetContext(externalState) as State;
      const current = serializeState(store.getState()) as State;
      if (!dequal(filtered, current)) {
        store.setState(filtered);
      }
    }
  });

  return store;
}
