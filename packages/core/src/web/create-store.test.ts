import { cleanup } from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from "vitest";
import type { StateCreator } from "zustand";
import { McpAppAdaptor } from "./bridges/mcp-app/adaptor.js";
import { McpAppBridge } from "./bridges/mcp-app/bridge.js";
import { createStore } from "./create-store.js";
import { VIEW_CONTEXT_KEY } from "./data-llm.js";
import {
  getMcpAppHostPostMessageMock,
  MockResizeObserver,
} from "./hooks/test/utils.js";

describe("createStore", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  describe("apps-sdk mode", () => {
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
      vi.stubGlobal("skybridge", { hostType: "apps-sdk" });
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
      OpenaiMock.widgetState = { modelContent: windowState };

      const store = createStore(storeCreator);

      expect(store.getState()).toEqual({ count: 20, name: "window" });
    });

    it("should persist state changes to window.openai.setWidgetState", async () => {
      type TestState = { count: number; increment: () => void };
      const storeCreator: StateCreator<TestState, [], [], TestState> = (
        set,
      ) => ({
        count: 0,
        increment: () => set((state) => ({ count: state.count + 1 })),
      });

      const store = createStore(storeCreator);
      store.getState().increment();

      await vi.waitFor(() => {
        expect(OpenaiMock.setWidgetState).toHaveBeenCalled();
      });

      const callArgs = OpenaiMock.setWidgetState.mock.calls[0]?.[0];
      expect(callArgs).toEqual({
        modelContent: { count: 1 },
        privateContent: {},
      });
    });

    it("should filter view context from initial state", () => {
      type TestState = { count: number };
      const storeCreator: StateCreator<TestState, [], [], TestState> = () => ({
        count: 0,
      });
      const windowState = {
        count: 5,
        [VIEW_CONTEXT_KEY]: "context-value",
      };
      OpenaiMock.widgetState = { modelContent: windowState };

      const store = createStore(storeCreator);

      expect(store.getState()).toEqual({ count: 5 });
      expect(
        (store.getState() as Record<string, unknown>)[VIEW_CONTEXT_KEY],
      ).toBeUndefined();
    });
  });

  describe("mcp-app mode", () => {
    beforeEach(() => {
      vi.stubGlobal("skybridge", { hostType: "mcp-app" });
      vi.stubGlobal("ResizeObserver", MockResizeObserver);
    });

    afterEach(async () => {
      cleanup();
      McpAppBridge.resetInstance();
      McpAppAdaptor.resetInstance();
    });

    it("should initialize with null viewState", () => {
      const adaptor = McpAppAdaptor.getInstance();
      const viewState = adaptor.getHostContextStore("viewState").getSnapshot();

      expect(viewState).toBeNull();
    });

    it("should create a store with default state when no persisted state exists", () => {
      type TestState = { count: number };
      const storeCreator: StateCreator<TestState, [], [], TestState> = () => ({
        count: 0,
      });

      const store = createStore(storeCreator);

      expect(store.getState()).toEqual({ count: 0 });
    });

    it("should update in-memory state via setViewState", async () => {
      const adaptor = McpAppAdaptor.getInstance();
      vi.spyOn(adaptor, "setViewState").mockResolvedValue(undefined);

      type TestState = { count: number; increment: () => void };
      const storeCreator: StateCreator<TestState, [], [], TestState> = (
        set,
      ) => ({
        count: 0,
        increment: () => set((state) => ({ count: state.count + 1 })),
      });

      const store = createStore(storeCreator);
      store.getState().increment();

      await vi.waitFor(() => {
        expect(adaptor.setViewState).toHaveBeenCalledWith({ count: 1 });
      });
    });

    it("should notify listeners when view state changes", async () => {
      const postMessageMock = getMcpAppHostPostMessageMock();
      vi.stubGlobal("parent", { postMessage: postMessageMock });

      const adaptor = McpAppAdaptor.getInstance();
      const listener = vi.fn();

      adaptor.getHostContextStore("viewState").subscribe(listener);
      await adaptor.setViewState({ count: 42 });

      expect(postMessageMock).toHaveBeenCalledWith(
        expect.objectContaining({ method: "ui/update-model-context" }),
        "*",
      );
      expect(listener).toHaveBeenCalled();
      expect(adaptor.getHostContextStore("viewState").getSnapshot()).toEqual({
        count: 42,
      });
    });
  });
});
