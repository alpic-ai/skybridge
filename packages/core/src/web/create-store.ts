import { dequal } from "dequal/lite";
import { create, type StateCreator } from "zustand";
import { getAdaptor } from "./bridges/index.js";
import {
  filterViewContext,
  getInitialState,
  injectViewContext,
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

  // Bidirectional sync between the Zustand store and the adaptor's viewState.
  // Store changes persist to the host; external viewState changes rehydrate the store.
  store.subscribe((state: State) => {
    const serializedState = serializeState(state);
    if (serializedState !== null && serializedState !== undefined) {
      const stateToPersist = injectViewContext(serializedState as State);
      if (stateToPersist !== null) {
        getAdaptor().setViewState(stateToPersist);
      }
    }
  });

  const viewStateStore = getAdaptor().getHostContextStore("viewState");
  viewStateStore.subscribe(() => {
    const externalState = viewStateStore.getSnapshot();
    if (externalState !== null) {
      const filtered = filterViewContext(externalState) as State;
      const current = serializeState(store.getState()) as State;
      if (!dequal(filtered, current)) {
        store.setState(filtered);
      }
    }
  });

  return store;
}
