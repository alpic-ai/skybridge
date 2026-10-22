import { anthropic } from "@ai-sdk/anthropic";
import { start } from "@skybridge/test";
import { expect, it } from "vitest";
import { app } from "../src/server.js";
import { typesafeJudge } from "./typesafe-judge.js";

const model = anthropic("claude-sonnet-4-5");

const prompt = "What ski goggles do you have, and how much are they?";

const criteria =
  "quotes only goggles that the tool returned, with the prices it returned, and invents no product";

it("answers from the catalog rather than from memory", async () => {
  const chat = await start({ app, model });
  await chat.send(prompt);

  await expect.chat(chat).toPassJudgment(criteria);
});

it.skipIf(!process.env.TYPESAFE_API_KEY)(
  "grades the same answer with Jev instead of a language model",
  async () => {
    const chat = await start({ app, model });
    await chat.send(prompt);

    await expect.chat(chat).toPassJudgment(criteria, { judge: typesafeJudge });
  },
);
