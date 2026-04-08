import { expectTypeOf, test } from "vitest";
import type { SendFollowUpMessageOptions } from "../bridges/types.js";
import type { useSendFollowUpMessage } from "./use-send-follow-up-message.js";

test("useSendFollowUpMessage accepts optional follow-up options", () => {
  type SendFollowUpMessage = ReturnType<typeof useSendFollowUpMessage>;

  expectTypeOf<Parameters<SendFollowUpMessage>[0]>().toEqualTypeOf<string>();
  expectTypeOf<Parameters<SendFollowUpMessage>[1]>().toEqualTypeOf<
    SendFollowUpMessageOptions | undefined
  >();
});
