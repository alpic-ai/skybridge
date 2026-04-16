import { expectTypeOf, test } from "vitest";
import type { RequestDisplayMode } from "../bridges/types.js";
import type { useDisplayMode } from "./use-display-mode.js";

test("setDisplayMode only accepts requestable display modes", () => {
  type SetDisplayMode = ReturnType<typeof useDisplayMode>[1];

  expectTypeOf<
    Parameters<SetDisplayMode>[0]
  >().toEqualTypeOf<RequestDisplayMode>();

  // @ts-expect-error "modal" is a host state, not a valid request mode
  const _invalidMode: Parameters<SetDisplayMode>[0] = "modal";
  void _invalidMode;
});
