import { expect } from "vitest";
import type { AppType } from "../../../examples/flight-booking/src/server.js";
import { expectedCalls } from "../src/chat.js";
import { defineEval } from "../src/define-eval.js";

defineEval<AppType>("city names map onto IATA codes", async (chat) => {
  await chat.send(
    "Find me flights from Paris to New York, leaving 2026-09-10 and coming back 2026-09-17",
  );

  expect(chat.toolCalls).toEqual(
    expectedCalls<AppType>([
      {
        name: "flight-booking",
        arguments: {
          origin: "CDG",
          destination: "JFK",
          departureDate: "2026-09-10",
          returnDate: "2026-09-17",
        },
      },
    ]),
  );
});

defineEval<AppType>("conversational refinement", async (chat) => {
  await chat.send(
    "Flights from London to Tokyo, 2026-10-01 to 2026-10-12 please",
  );
  await chat.send(
    "Search again, direct flights only, and nothing over 900 euros",
  );

  expect(chat.toolCalls).toEqual(
    expectedCalls<AppType>([
      {
        name: "flight-booking",
        arguments: {
          origin: "LHR",
          destination: "NRT",
          departureDate: "2026-10-01",
          returnDate: "2026-10-12",
        },
      },
      {
        name: "flight-booking",
        arguments: {
          origin: "LHR",
          destination: "NRT",
          departureDate: "2026-10-01",
          returnDate: "2026-10-12",
          directOnly: true,
          maxPrice: 900,
        },
      },
    ]),
  );
});

defineEval<AppType>("a question about the app books nothing", async (chat) => {
  await chat.send("What can you help me with?");

  expect(chat.toolCalls).toEqual([]);
});

defineEval<AppType>(
  "relative dates are not reproducible without a frozen clock",
  async (chat) => {
    await chat.send(
      "I need a flight from Berlin to Madrid next Friday, back the Sunday after",
    );

    expect(chat.toolCalls).toEqual(
      expectedCalls<AppType>([
        {
          name: "flight-booking",
          arguments: {
            origin: "BER",
            destination: "MAD",
            departureDate: "2026-08-14",
            returnDate: "2026-08-23",
          },
        },
      ]),
    );
  },
);
