import { inject } from "vitest";

function isAssertionFailure(error: unknown): error is Error {
  if (!(error instanceof Error)) {
    return false;
  }
  return (
    error.name === "AssertionError" ||
    "matcherResult" in error ||
    ("actual" in error && "expected" in error)
  );
}

/**
 * Runs a scenario several times and passes when the success rate reaches the
 * threshold. Defaults come from the plugin config, so CI can raise `runs`
 * without touching a test; a scenario overrides them here when it has reason
 * to. A single run at temperature 0 stays the cheap local loop.
 */
export async function repeat(
  options: { runs?: number; threshold?: number },
  scenario: () => Promise<void>,
): Promise<void> {
  const config = inject("skybridgeEvals");
  const runs = options.runs ?? config.runs ?? 1;
  const threshold = options.threshold ?? config.threshold ?? 1;

  let passed = 0;
  const outcomes: string[] = [];
  for (let attempt = 1; attempt <= runs; attempt++) {
    try {
      await scenario();
      passed++;
      outcomes.push(`run ${attempt}: passed`);
    } catch (error) {
      if (!isAssertionFailure(error)) {
        throw error;
      }
      outcomes.push(`run ${attempt}: ${error.message}`);
    }
  }

  const rate = passed / runs;
  if (rate < threshold) {
    throw new Error(
      `Passed ${passed}/${runs} runs (${rate.toFixed(2)}), below the ${threshold} threshold.\n\n${outcomes.join("\n\n")}`,
    );
  }
}
