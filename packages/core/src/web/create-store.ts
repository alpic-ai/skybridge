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

/**
 * Create a Zustand store that is bidirectionally synced with the host's
 * `viewState`. Local store updates persist to the host, and external host
 * updates rehydrate the store — making the store the single source of truth
 * for state that should survive view remounts.
 *
 * Use this when you outgrow {@link useViewState} and want first-class Zustand
 * ergonomics (selectors, actions, middleware). Otherwise prefer `useViewState`.
 *
 * Skybridge-internal context fields (see {@link DataLLM}) are filtered out
 * automatically before reaching your store.
 *
 * @typeParam State - Shape of the store's state. Must be a plain object.
 *
 * @example
 * ```ts
 * export const useStore = createStore<{ count: number; inc: () => void }>(
 *   (set) => ({
 *     count: 0,
 *     inc: () => set((s) => ({ count: s.count + 1 })),
 *   }),
 * );
 * ```
 *
 * @see https://docs.skybridge.tech/api-reference/create-store
 */
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
