import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from "vitest";
import { createStore } from "./create-store.js";
import type { StateCreator } from "zustand";
import { WIDGET_CONTEXT_KEY } from "./data-llm.js";

describe("createStore", () => {
  let OpenaiMock: {
    widgetState: unknown;
    setWidgetState: Mock;
  };

  beforeEach(() => {
    OpenaiMock = {
      widgetState: null,
      setWidgetState: vi.fn().mockResolvedValue(undefined),
    };
    vi.stubGlobal("openai", OpenaiMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it("should create a store without default state", () => {
    type TestState = { count: number };
    const storeCreator: StateCreator<TestState, [], [], TestState> = () => ({
      count: 0,
    });

    const store = createStore(storeCreator);

    expect(store.getState()).toEqual({ count: 0 });
  });

  it("should create a store with default state", () => {
    type TestState = { count: number; name: string };
    const storeCreator: StateCreator<TestState, [], [], TestState> = () => ({
      count: 0,
      name: "initial",
    });
    const defaultState = { count: 5, name: "default" };

    const store = createStore(storeCreator, defaultState);

    expect(store.getState()).toEqual({ count: 5, name: "default" });
  });

  it("should initialize from window.openai.widgetState when available", () => {
    type TestState = { count: number; name: string };
    const storeCreator: StateCreator<TestState, [], [], TestState> = () => ({
      count: 0,
      name: "initial",
    });
    const windowState = { count: 20, name: "window" };
    OpenaiMock.widgetState = windowState;

    const store = createStore(storeCreator);

    expect(store.getState()).toEqual({ count: 20, name: "window" });
  });

  it("should persist state changes to window.openai.setWidgetState", async () => {
    type TestState = { count: number; increment: () => void };
    const storeCreator: StateCreator<TestState, [], [], TestState> = (set) => ({
      count: 0,
      increment: () => set((state) => ({ count: state.count + 1 })),
    });

    const store = createStore(storeCreator);
    store.getState().increment();

    await vi.waitFor(() => {
      expect(OpenaiMock.setWidgetState).toHaveBeenCalled();
    });

    const callArgs = OpenaiMock.setWidgetState.mock.calls[0]?.[0];
    expect(callArgs).toEqual({ count: 1 });
  });

  it("should filter widget context from initial state", () => {
    type TestState = { count: number };
    const storeCreator: StateCreator<TestState, [], [], TestState> = () => ({
      count: 0,
    });
    const windowState = {
      count: 5,
      [WIDGET_CONTEXT_KEY]: "context-value",
    };
    OpenaiMock.widgetState = windowState;

    const store = createStore(storeCreator);

    expect(store.getState()).toEqual({ count: 5 });
    expect(
      (store.getState() as Record<string, unknown>)[WIDGET_CONTEXT_KEY]
    ).toBeUndefined();
  });
});
