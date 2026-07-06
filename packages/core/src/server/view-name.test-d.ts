import { expectTypeOf, test } from "vitest";
import type { ViewNameFor } from "./server.js";

test("ViewNameFor falls back to string when the registry is empty", () => {
  expectTypeOf<ViewNameFor<Record<never, never>>>().toEqualTypeOf<string>();
});

test("ViewNameFor narrows to the registered view names when populated", () => {
  expectTypeOf<ViewNameFor<{ home: true; about: true }>>().toEqualTypeOf<
    "home" | "about"
  >();
});
