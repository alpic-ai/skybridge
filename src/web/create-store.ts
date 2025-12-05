import { create, type StateCreator } from "zustand";
import {
  deserializeState,
  filterWidgetContext,
  getInitialState,
  injectWidgetContext,
  serializeState,
} from "./helpers/state.js";
import type { UnknownObject } from "./types.js";
import { SET_GLOBALS_EVENT_TYPE, type SetGlobalsEvent } from "./types.js";
import type { SuperJSONResult } from "superjson";

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

  let isInternalUpdate = false;

  store.subscribe((state: State) => {
    if (!isInternalUpdate && window.openai) {
      const serializedState = serializeState(state);
      if (serializedState !== null && serializedState !== undefined) {
        const stateToPersist = injectWidgetContext(serializedState as State);
        if (stateToPersist !== null) {
          window.openai.setWidgetState(stateToPersist);
        }
      }
    }
  });

  const handleSetGlobals = (event: SetGlobalsEvent) => {
    const widgetState = event.detail.globals.widgetState as
      | SuperJSONResult
      | null
      | undefined;
    if (!widgetState) return;

    const deserialized = deserializeState(widgetState) as State | null;
    const filteredState = filterWidgetContext<State>(deserialized);
    if (filteredState !== null) {
      isInternalUpdate = true;
      store.setState(filteredState);
      isInternalUpdate = false;
    }
  };

  window.addEventListener(SET_GLOBALS_EVENT_TYPE, handleSetGlobals, {
    passive: true,
  });

  return store;
}
