import { expect } from "vitest";
import type { AppType } from "../../../examples/flight-booking/src/server.js";
import { type ExpectedToolCalls, expectedCalls } from "./chat.js";

declare const toolCalls: unknown[];

/**
 * Finding: vitest types `toEqual` as `<E>(expected: E) => void`, so none of
 * these is a type error. The typed registry buys nothing at the call site.
 */
expect(toolCalls).toEqual([
  { name: "flight-bookings", arguments: { origin: "CDG" } },
]);
expect(toolCalls).toEqual([
  { name: "flight-booking", arguments: { maxPrice: "cheap" } },
]);
expect(toolCalls).toEqual([
  { name: "flight-booking", arguments: { cabinClass: "business" } },
]);

/**
 * All three do fail to typecheck once the expectation passes through
 * `expectedCalls`, which pins it to the registry.
 */
expect(toolCalls).toEqual(
  expectedCalls<AppType>([
    // @ts-expect-error unknown tool name
    { name: "flight-bookings", arguments: { origin: "CDG" } },
  ]),
);
expect(toolCalls).toEqual(
  expectedCalls<AppType>([
    // @ts-expect-error maxPrice is a number
    { name: "flight-booking", arguments: { maxPrice: "cheap" } },
  ]),
);
expect(toolCalls).toEqual(
  expectedCalls<AppType>([
    // @ts-expect-error the tool has no cabinClass argument
    { name: "flight-booking", arguments: { cabinClass: "business" } },
  ]),
);

const valid: ExpectedToolCalls<AppType> = [
  {
    name: "flight-booking",
    arguments: {
      origin: "CDG",
      destination: "JFK",
      departureDate: "2026-09-10",
      returnDate: "2026-09-17",
    },
  },
  { name: "flight-booking", arguments: { directOnly: true, maxPrice: 900 } },
];
void valid;
