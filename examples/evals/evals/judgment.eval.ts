import { anthropic } from "@ai-sdk/anthropic";
import { type Judgment, start, type Verdict } from "@skybridge/test";
import { TypeSafeClient, noul } from "@typesafe-ai/sdk";
import { expect, it } from "vitest";
import { app } from "../src/server.js";

const model = anthropic("claude-sonnet-4-5");

const typesafe = new TypeSafeClient();

async function jev({ criteria, transcript }: Judgment): Promise<Verdict> {
  const { answers } = await typesafe.systemOne({
    state: { criteria, conversation: transcript },
    questions: {
      pass: noul("Does the conversation satisfy the criteria?", {
        true: "the criteria are satisfied",
        false: "the criteria are not satisfied",
      }),
    },
  });

  return {
    pass: answers.pass.noul >= 0.5,
    reasoning: `P(pass) = ${answers.pass.noul.toFixed(2)}`,
  };
}

it("answers from the catalog rather than from memory", async () => {
  const chat = await start({ app, model });
  await chat.send("What ski goggles do you have, and how much are they?");

  await expect
    .chat(chat)
    .toPassJudgment(
      "quotes only goggles that the tool returned, with the prices it returned, and invents no product",
    );
});

it.skipIf(!process.env.TYPESAFE_API_KEY)(
  "grades the same answer with Jev instead of a language model",
  async () => {
    const chat = await start({ app, model });
    await chat.send("What ski goggles do you have, and how much are they?");

    await expect
      .chat(chat)
      .toPassJudgment(
        "quotes only goggles that the tool returned, with the prices it returned, and invents no product",
        { judge: jev },
      );
  },
);
