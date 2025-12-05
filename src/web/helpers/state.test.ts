import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from "vitest";
import {
  filterWidgetContext,
  injectWidgetContext,
  serializeState,
  getInitialState,
} from "./state.js";
import { WIDGET_CONTEXT_KEY } from "../data-llm.js";

describe("state helpers", () => {
  describe("filterWidgetContext", () => {
    it("should return null when state is null", () => {
      expect(filterWidgetContext(null)).toBe(null);
    });

    it("should return null when state is undefined", () => {
      expect(filterWidgetContext(undefined)).toBe(null);
    });

    it("should correctly filter WIDGET_CONTEXT_KEY and preserve other properties", () => {
      const stateWithCtxAndOthers = {
        a: 1,
        b: "two",
        c: { nested: true },
        [WIDGET_CONTEXT_KEY]: "context",
      };
      const filteredWithCtxAndOthers = filterWidgetContext(
        stateWithCtxAndOthers
      );
      expect(filteredWithCtxAndOthers).toEqual({
        a: 1,
        b: "two",
        c: { nested: true },
      });

      const stateNoCtx = { count: 5, name: "test" };
      const filteredNoCtx = filterWidgetContext(stateNoCtx);
      expect(filteredNoCtx).toEqual(stateNoCtx);
    });
  });

  describe("serializeState", () => {
    it("should serialize plain objects", () => {
      const arr = [1, "two", { three: 3 }];
      const date = new Date("2023-01-01T00:00:00Z");
      const obj = { a: 1, b: "test", c: true, arr, date, fn: () => "test" };
      const result = serializeState(obj);

      expect(result).toEqual({
        a: 1,
        b: "test",
        c: true,
        arr: [1, "two", { three: 3 }],
        date: new Date("2023-01-01T00:00:00.000Z"),
      });
    });
  });
});
