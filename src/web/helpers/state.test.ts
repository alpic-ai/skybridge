import { describe, expect, it } from "vitest";
import { WIDGET_CONTEXT_KEY } from "../data-llm.js";
import { filterWidgetContext, serializeState } from "./state.js";

describe("state helpers", () => {
  describe("filterWidgetContext", () => {
    it("should return null when state is null", () => {
      expect(filterWidgetContext(null)).toBe(null);
    });

    it("should return null when state is undefined", () => {
      expect(filterWidgetContext(undefined)).toBe(null);
    });

    it("should correctly filter WIDGET_CONTEXT_KEY and preserve other properties", () => {
      const stateWithContextAndOthers = {
        a: 1,
        b: "two",
        c: { nested: true },
        [WIDGET_CONTEXT_KEY]: "context",
      };
      const filteredWithContextAndOthers = filterWidgetContext(
        stateWithContextAndOthers,
      );
      expect(filteredWithContextAndOthers).toEqual({
        a: 1,
        b: "two",
        c: { nested: true },
      });

      const stateNoContext = { count: 5, name: "test" };
      const filteredNoContext = filterWidgetContext(stateNoContext);
      expect(filteredNoContext).toEqual(stateNoContext);
    });
  });

  describe("serializeState", () => {
    it("should serialize plain objects", () => {
      const array = [1, "two", { three: 3 }];
      const date = new Date("2023-01-01T00:00:00Z");
      const object = {
        a: 1,
        b: "test",
        c: true,
        array,
        date,
        function: () => "test",
      };
      const result = serializeState(object);

      expect(result).toEqual({
        a: 1,
        b: "test",
        c: true,
        array: [1, "two", { three: 3 }],
        date: new Date("2023-01-01T00:00:00.000Z"),
      });
    });
  });
});
