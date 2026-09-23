import type { Judgment, Verdict } from "@skybridge/test";
import { TypeSafeClient, noul } from "@typesafe-ai/sdk";

/**
 * Grades a conversation with Jev, an evaluation model that answers a typed
 * question with a probability instead of writing text. Pass it as the `judge`
 * option of `toPassJudgment`.
 */
export async function typesafeJudge({
  criteria,
  transcript,
}: Judgment): Promise<Verdict> {
  const { answers } = await new TypeSafeClient().systemOne({
    state: { conversation: transcript },
    questions: { pass: noul(criteria) },
  });

  return {
    pass: answers.pass.noul >= 0.5,
    reasoning: `P(pass) = ${answers.pass.noul.toFixed(2)}`,
  };
}
