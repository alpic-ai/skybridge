import "@/index.css";

import { Button } from "@alpic-ai/ui/components/button";
import { Check, Copy, Play, RefreshCw, SkipForward, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getAdaptor,
  useLayout,
  useRequestModal,
  useViewState,
} from "skybridge/web";
import {
  detectRuntime,
  TESTS,
  type TestResult,
  type Verdict,
} from "@/tests.js";

type RowVerdict = Verdict | "skipped";
type RowResult = { verdict: RowVerdict; detail: string };

const ICON: Record<RowVerdict | "untested", string> = {
  supported: "✅",
  partial: "🟠",
  unsupported: "⚠️",
  error: "❌",
  skipped: "▫️",
  untested: "▫️",
};

const BADGE: Record<RowVerdict, string> = {
  supported:
    "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  partial:
    "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
  unsupported:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-400",
  error: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  skipped: "bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-400",
};

function Badge({ verdict }: { verdict: RowVerdict }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 type-text-xs font-medium ${BADGE[verdict]}`}
    >
      {verdict}
    </span>
  );
}

/**
 * Copy text to the clipboard, falling back to execCommand when the async
 * Clipboard API is blocked in the host iframe. Returns false if both fail.
 */
async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Clipboard API blocked in this iframe — fall through to execCommand.
    }
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function toMarkdown(rows: (RowResult | null)[], runtime: string): string {
  const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
  const counts: Partial<Record<RowVerdict | "untested", number>> = {};
  for (const row of rows) {
    const verdict = row?.verdict ?? "untested";
    counts[verdict] = (counts[verdict] ?? 0) + 1;
  }
  return [
    "# Skybridge hooks conformance",
    "",
    `- Host runtime: \`${runtime}\``,
    `- Generated: ${new Date().toISOString()}`,
    `- Supported: ${counts.supported ?? 0}/${TESTS.length} · partial ${counts.partial ?? 0} · unsupported ${counts.unsupported ?? 0} · error ${counts.error ?? 0} · skipped/untested ${(counts.skipped ?? 0) + (counts.untested ?? 0)}`,
    "",
    "| Hook | Test | Result | Detail |",
    "| --- | --- | --- | --- |",
    ...TESTS.map((test, i) => {
      const row = rows[i];
      const verdict = row?.verdict ?? "untested";
      return `| \`${test.hook}\` | ${cell(test.name)} | ${ICON[verdict]} ${verdict} | ${cell(row?.detail ?? "")} |`;
    }),
    "",
  ].join("\n");
}

type RunState = { step: number; rows: (RowResult | null)[] };

function Runner({ onRestart }: { onRestart: () => void }) {
  const runtime = detectRuntime();
  // Recorded results are mirrored to the host viewState so the run survives
  // host-driven view remounts (fullscreen switches, the modal round-trip).
  const [viewState, setViewState] = useViewState<{ run?: RunState }>();
  const saved = useRef(
    viewState?.run?.rows.length === TESTS.length ? viewState.run : undefined,
  ).current;
  const [step, setStep] = useState(saved?.step ?? 0);
  const [rows, setRows] = useState<(RowResult | null)[]>(
    () => saved?.rows ?? TESTS.map(() => null),
  );
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const [armed, setArmed] = useState(false);
  const [confirming, setConfirming] = useState<TestResult | null>(null);
  const recordedRef = useRef(
    new Set((saved?.rows ?? []).flatMap((row, i) => (row ? [i] : []))),
  );

  const test = TESTS[step];
  const doneCount = rows.filter(Boolean).length;
  const done = step >= TESTS.length;

  const recordAt = useCallback(
    (index: number, result: RowResult) => {
      if (recordedRef.current.has(index)) {
        return;
      }
      recordedRef.current.add(index);
      const next = rowsRef.current.map((row, i) =>
        i === index ? result : row,
      );
      setRows(next);
      setViewState((prev) => ({
        ...prev,
        run: { step: index + 1, rows: next },
      }));
      setArmed(false);
      setConfirming(null);
      // Advance only if the run is still on that step (guards late reports).
      setStep((s) => (s === index ? s + 1 : s));
    },
    [setViewState],
  );

  const restart = () => {
    setViewState((prev) => ({ ...prev, run: undefined }));
    onRestart();
  };

  const handleResult = useCallback(
    (index: number, result: TestResult) => {
      if (recordedRef.current.has(index)) {
        return;
      }
      if (TESTS[index].confirm && result.verdict === "supported") {
        setConfirming(result);
      } else {
        recordAt(index, result);
      }
    },
    [recordAt],
  );

  // Safety net: an auto test that never reports must not stall the run.
  useEffect(() => {
    if (!TESTS[step]?.auto) {
      return;
    }
    const timer = setTimeout(
      () => recordAt(step, { verdict: "error", detail: "timed out after 15s" }),
      15_000,
    );
    return () => clearTimeout(timer);
  }, [step, recordAt]);

  const running = test && (test.auto || armed) && !confirming;

  const [copied, setCopied] = useState<"idle" | "ok">("idle");
  const [fallbackMd, setFallbackMd] = useState<string | null>(null);
  const copyMarkdown = async () => {
    const markdown = toMarkdown(rows, runtime);
    if (await copyText(markdown)) {
      setFallbackMd(null);
      setCopied("ok");
      setTimeout(() => setCopied("idle"), 2000);
    } else {
      // Clipboard fully blocked — reveal the report to copy manually.
      setFallbackMd(markdown);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {running && (
        <div hidden>
          <test.Test key={step} onResult={(r) => handleResult(step, r)} />
        </div>
      )}

      <header className="flex flex-col gap-2">
        <h1 className="type-display-xs font-semibold text-foreground">
          Skybridge hooks conformance
        </h1>
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${(doneCount / TESTS.length) * 100}%` }}
          />
        </div>
      </header>

      {/* Stepper */}
      <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
        {done ? (
          <>
            <h2 className="type-text-lg font-semibold text-foreground">
              Run complete
            </h2>
            <p className="type-text-sm text-muted-foreground">
              {rows.filter((r) => r?.verdict === "supported").length} of{" "}
              {TESTS.length} hooks supported on this host. Copy the table below
              to share the report.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="type-text-sm text-muted-foreground">
                Test {step + 1} of {TESTS.length}
              </span>
              <Button
                variant="secondary"
                icon={<SkipForward />}
                onClick={() =>
                  recordAt(step, {
                    verdict: "skipped",
                    detail: "skipped by user",
                  })
                }
              >
                Skip
              </Button>
            </div>
            <div className="flex flex-wrap items-baseline gap-2">
              <code className="rounded-md bg-muted px-2 py-1 font-mono type-text-sm text-foreground">
                {test.hook}
              </code>
              <span className="type-text-sm font-semibold text-foreground">
                {test.name}
              </span>
            </div>
            <p className="type-text-sm text-muted-foreground">
              {test.description}
            </p>
            {confirming ? (
              <div className="flex flex-col gap-3">
                <p className="type-text-sm font-medium text-foreground">
                  {test.confirm}
                </p>
                <p className="type-text-xs text-muted-foreground">
                  {confirming.detail}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    icon={<Check />}
                    onClick={() =>
                      recordAt(step, {
                        ...confirming,
                        detail: `${confirming.detail} · confirmed by user`,
                      })
                    }
                  >
                    Yes, it worked
                  </Button>
                  <Button
                    variant="secondary"
                    icon={<X />}
                    onClick={() =>
                      recordAt(step, {
                        verdict: "unsupported",
                        detail: `${confirming.detail} without error · but user saw no effect`,
                      })
                    }
                  >
                    No effect
                  </Button>
                </div>
              </div>
            ) : running ? (
              <p className="type-text-sm text-muted-foreground animate-pulse">
                Running {test.hook}…
              </p>
            ) : (
              <Button
                className="w-fit"
                icon={<Play />}
                onClick={() => setArmed(true)}
              >
                {test.runLabel ?? "Run"}
              </Button>
            )}
          </>
        )}
      </section>

      {/* Results table */}
      <section className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
          <h2 className="type-text-lg font-semibold text-foreground">
            Results
          </h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={<RefreshCw />} onClick={restart}>
              Restart
            </Button>
            <Button
              variant="secondary"
              icon={copied === "ok" ? <Check /> : <Copy />}
              onClick={copyMarkdown}
            >
              {copied === "ok" ? "Copied" : "Copy markdown"}
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full type-text-sm">
            <thead>
              <tr className="text-left type-text-xs uppercase tracking-wider text-muted-foreground">
                <th className="p-3 font-medium">Hook</th>
                <th className="p-3 font-medium">Result</th>
                <th className="p-3 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border border-t border-border">
              {TESTS.map((t, i) => {
                const row = rows[i];
                return (
                  <tr key={t.hook} className={i === step ? "bg-muted/50" : ""}>
                    <td className="p-3 align-top">
                      <code className="font-mono text-foreground">
                        {t.hook}
                      </code>
                      <div className="type-text-xs text-muted-foreground">
                        {t.name}
                      </div>
                    </td>
                    <td className="p-3 align-top">
                      {row ? (
                        <Badge verdict={row.verdict} />
                      ) : (
                        <span className="type-text-xs text-muted-foreground">
                          {i === step ? "testing…" : "—"}
                        </span>
                      )}
                    </td>
                    <td className="p-3 align-top type-text-xs text-muted-foreground">
                      {row?.detail}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {fallbackMd !== null && (
          <div className="flex flex-col gap-1 border-t border-border p-4">
            <p className="type-text-xs text-muted-foreground">
              Clipboard is blocked in this host — select all below and copy
              manually.
            </p>
            <textarea
              readOnly
              value={fallbackMd}
              onFocus={(e) => e.currentTarget.select()}
              className="h-48 w-full rounded-md border border-border bg-muted p-2 font-mono type-text-xs text-foreground"
            />
          </div>
        )}
      </section>
    </div>
  );
}

function ModalNotice() {
  return (
    <div className="flex max-w-sm flex-col gap-2 p-6">
      <h2 className="type-text-lg font-semibold text-foreground">
        Modal opened ✓
      </h2>
      <p className="type-text-sm text-muted-foreground">
        useRequestModal rendered this view in modal mode. Close it to answer the
        confirmation.
      </p>
      <Button
        className="w-fit"
        icon={<X />}
        onClick={() => getAdaptor().closeModal()}
      >
        Close
      </Button>
    </div>
  );
}

function App() {
  const { theme } = useLayout();
  const { isOpen } = useRequestModal();
  // A view born in modal mode is the host's dedicated modal instance — show
  // the notice only, never a second runner.
  const bornInModal = useRef(isOpen);
  const [epoch, setEpoch] = useState(0);

  return (
    <div
      className={`${theme === "dark" ? "dark " : ""}bg-background text-foreground`}
    >
      {bornInModal.current ? (
        <ModalNotice />
      ) : (
        <>
          {isOpen && <ModalNotice />}
          {/* Keep the runner mounted (hidden) during the modal round-trip so
              results and the pending confirmation survive. */}
          <div hidden={isOpen} className="min-h-dvh">
            <div className="mx-auto max-w-2xl p-4">
              <Runner key={epoch} onRestart={() => setEpoch((e) => e + 1)} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
