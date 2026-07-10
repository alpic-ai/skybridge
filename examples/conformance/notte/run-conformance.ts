/**
 * Cloud-run the ChatGPT conformance function and gate on expected results.
 *
 * Writes into --out:
 *     results.json    rows + counts + run metadata + baseline mismatches
 *     screenshot.png  final screenshot
 *
 * Compares each hook's verdict against the JSON baseline (--expected, a
 * {hook: verdict} map like chatgpt_expected.json) and exits non-zero on any
 * mismatch, so CI fails when host support regresses (or improves — update the
 * baseline then).
 *
 * Usage:
 *     NOTTE_API_KEY=... node run-conformance.ts \
 *         --function-id <id> --profile-id notte-profile-... \
 *         [--app-name Conformance] [--out conformance-results] \
 *         [--expected chatgpt_expected.json]
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const API_URL = process.env.NOTTE_API_URL ?? "https://api.notte.cc";
const RUN_TIMEOUT_MS = 12 * 60 * 1000;
const POLL_INTERVAL_MS = 10_000;

type Row = { hook: string; result: string; detail: string };

type RunStatus = {
  status: "active" | "closed" | "failed";
  session_id: string | null;
  result: unknown;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function compare(rows: Row[], expected: Record<string, string>): string[] {
  const actual = new Map(
    rows.map((row) => [row.hook, row.result.trim().toLowerCase()]),
  );
  const mismatches: string[] = [];
  for (const [hook, want] of Object.entries(expected)) {
    const got = actual.get(hook) ?? "missing";
    if (got !== want) {
      mismatches.push(`${hook}: expected '${want}', got '${got}'`);
    }
  }
  for (const hook of actual.keys()) {
    if (!(hook in expected)) {
      mismatches.push(`${hook}: not in the expected baseline`);
    }
  }
  return mismatches;
}

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: {
      "function-id": { type: "string" },
      "profile-id": { type: "string" },
      "app-name": { type: "string", default: "Conformance" },
      out: { type: "string", default: "conformance-results" },
      expected: {
        type: "string",
        default: join(
          dirname(fileURLToPath(import.meta.url)),
          "chatgpt_expected.json",
        ),
      },
    },
  });

  const apiKey = process.env.NOTTE_API_KEY;
  if (!apiKey) {
    console.error("NOTTE_API_KEY is not set");
    return 1;
  }
  const functionId = values["function-id"] ?? process.env.NOTTE_CHATGPT_FUNCTION_ID;
  const profileId = values["profile-id"] ?? process.env.NOTTE_PROFILE_ID;
  if (!functionId || !profileId) {
    console.error(
      "--function-id and --profile-id are required (flags or NOTTE_CHATGPT_FUNCTION_ID / NOTTE_PROFILE_ID env)",
    );
    return 1;
  }
  console.log(`function=${functionId} profile=${profileId}`);

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "x-notte-api-key": apiKey,
    "Content-Type": "application/json",
  };

  // Create the run record first, so the id exists independently of any
  // connection: the start request below blocks for the whole run (~10 min),
  // and a dropped connection must not orphan the result.
  const createResponse = await fetch(`${API_URL}/functions/${functionId}/runs/create`, {
    method: "POST",
    headers,
    body: JSON.stringify({ local: false }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!createResponse.ok) {
    console.error(`runs/create returned ${createResponse.status}: ${await createResponse.text()}`);
    return 1;
  }
  const { function_run_id: runId } = (await createResponse.json()) as {
    function_run_id: string;
  };
  console.log(`run=${runId} created`);

  // Kick the run without awaiting it — polling below owns the outcome. An
  // HTTP-level rejection means the run will never start, so surface it; a
  // dropped connection is harmless.
  let startFailure: string | null = null;
  void fetch(`${API_URL}/functions/${functionId}/runs/${runId}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      function_id: functionId,
      // The server binds execution to the record via the BODY's run id (the
      // path id alone is not enough) — without it the record stays "active"
      // forever and polling never terminates.
      function_run_id: runId,
      variables: { profile_id: profileId, app_name: values["app-name"] },
      stream: false,
    }),
  })
    .then(async (response) => {
      if (!response.ok) {
        startFailure = `runs/${runId} start returned ${response.status}: ${await response.text()}`;
      }
    })
    .catch((error) => {
      console.log(
        `start connection dropped (${error instanceof Error ? error.message : error}); polling continues`,
      );
    });

  const startedAt = Date.now();
  const deadline = startedAt + RUN_TIMEOUT_MS;
  const elapsed = () => {
    const seconds = Math.round((Date.now() - startedAt) / 1000);
    return `${Math.floor(seconds / 60)}m${String(seconds % 60).padStart(2, "0")}s`;
  };
  let run: RunStatus | null = null;
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    if (startFailure) {
      console.error(startFailure);
      return 1;
    }
    const poll = await fetch(`${API_URL}/functions/${functionId}/runs/${runId}`, {
      headers,
      signal: AbortSignal.timeout(30_000),
    }).catch(() => null);
    if (!poll?.ok) {
      console.log(`poll failed, retrying (elapsed=${elapsed()})`);
      continue;
    }
    run = (await poll.json()) as RunStatus;
    console.log(`status=${run.status} elapsed=${elapsed()}`);
    if (run.status !== "active") {
      break;
    }
  }
  if (!run || run.status === "active") {
    console.error(`run ${runId} did not finish within ${RUN_TIMEOUT_MS / 60_000} minutes`);
    return 1;
  }

  let result = run.result;
  if (typeof result === "string") {
    try {
      result = JSON.parse(result);
    } catch {
      // leave as-is; treated as a failure below
    }
  }
  if (run.status !== "closed" || typeof result !== "object" || result === null) {
    console.error(`run did not complete cleanly: ${JSON.stringify(run.result)?.slice(0, 500)}`);
    return 1;
  }
  const { screenshot_b64, ...results } = result as {
    screenshot_b64?: string | null;
    rows?: Row[];
    counts?: Record<string, number>;
  };
  const rows = results.rows ?? [];

  let mismatches: string[] = [];
  if (values.expected) {
    const expected = JSON.parse(readFileSync(values.expected, "utf8")) as Record<string, string>;
    mismatches = compare(rows, expected);
  }

  mkdirSync(values.out, { recursive: true });
  if (screenshot_b64) {
    writeFileSync(join(values.out, "screenshot.png"), Buffer.from(screenshot_b64, "base64"));
  }
  writeFileSync(
    join(values.out, "results.json"),
    JSON.stringify(
      {
        function_run_id: runId,
        session_id: run.session_id,
        mismatches,
        ...results,
      },
      null,
      2,
    ),
  );
  console.log(`artifacts written to ${values.out}/`);

  if (rows.length === 0) {
    console.error("the run recorded no results");
    return 1;
  }
  console.log(`counts: ${JSON.stringify(results.counts)}`);
  if (mismatches.length > 0) {
    console.error("baseline mismatches:");
    for (const mismatch of mismatches) {
      console.error(`  - ${mismatch}`);
    }
    return 1;
  }
  console.log("all results match the expected baseline");
  return 0;
}

try {
  process.exitCode = await main();
} catch (error) {
  console.error(`run failed: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
}
