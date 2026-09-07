import "@/index.css";

import { Button } from "@alpic-ai/ui/components/button";
import { Check, Copy, Play, RefreshCw, SkipForward, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getAdaptor,
  useDisplayMode,
  useLayout,
  useRequestModal,
  useViewState,
} from "skybridge/web";
import { useDriveListener, useStateBroadcast } from "@/automation.js";
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

function Runner() {
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

  // Reset in place rather than remounting (a key bump would unmount this
  // component in the same batch and React can drop the pending viewState
  // updater, resurrecting the old run on the next mount).
  const restart = () => {
    recordedRef.current.clear();
    setStep(0);
    setRows(TESTS.map(() => null));
    setArmed(false);
    setConfirming(null);
    setViewState((prev) => ({ ...prev, run: undefined }));
  };

  const skipCurrent = () =>
    recordAt(step, { verdict: "skipped", detail: "skipped by user" });
  const confirmYes = () => {
    if (confirming) {
      recordAt(step, {
        ...confirming,
        detail: `${confirming.detail} · confirmed by user`,
      });
    }
  };
  const confirmNo = () => {
    if (confirming) {
      recordAt(step, {
        verdict: "unsupported",
        detail: `${confirming.detail} without error · but user saw no effect`,
      });
    }
  };

  // Remote control for external drivers (the Playwright driver in
  // notte/conformance.py): see src/automation.ts for the protocol.
  const [, setDisplayMode] = useDisplayMode();
  useDriveListener((action) => {
    if (action === "run" && test && !test.auto && !confirming) {
      setArmed(true);
    } else if (action === "skip" && !done) {
      skipCurrent();
    } else if (action === "yes") {
      confirmYes();
    } else if (action === "no") {
      confirmNo();
    } else if (action === "close-modal") {
      getAdaptor().closeModal();
    } else if (action === "restore-inline") {
      // The displayMode test leaves fullscreen for the user to undo; an
      // automated driver undoes it through the same public API.
      setDisplayMode("inline").catch(() => {});
    }
  });
  useStateBroadcast(() => ({
    run_complete: done,
    current_hook: test?.hook ?? null,
    action_button:
      test && !test.auto && !armed && !confirming
        ? (test.runLabel ?? "Run")
        : null,
    confirm_question: confirming ? (test?.confirm ?? null) : null,
    // Never derived from useRequestModal().isOpen: on Apps SDK the store flag
    // flips even when the host renders no usable modal, which would falsely
    // confirm the test. A modal_open:true broadcast comes only from an
    // actually-mounted modal view (StandaloneModalRemote).
    modal_open: false,
    rows: TESTS.map((t, i) => ({
      hook: t.hook,
      result: rows[i]?.verdict ?? (i === step ? "testing" : ""),
      detail: rows[i]?.detail ?? "",
    })),
  }));

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
    const timeoutMs = TESTS[step].timeoutMs ?? 15_000;
    const timer = setTimeout(
      () =>
        recordAt(step, {
          verdict: "error",
          detail: `timed out after ${timeoutMs / 1000}s`,
        }),
      timeoutMs,
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
                onClick={() => skipCurrent()}
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
                  <Button icon={<Check />} onClick={confirmYes}>
                    Yes, it worked
                  </Button>
                  <Button variant="secondary" icon={<X />} onClick={confirmNo}>
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

function StandaloneModalRemote() {
  // Wiring for a DEDICATED modal instance (Apps SDK renders the modal as a
  // fresh view): no runner is mounted there, so the remote control needs its
  // own listener and state broadcast.
  useDriveListener((action) => {
    if (action === "close-modal") {
      getAdaptor().closeModal();
    }
  });
  // Only claim modal_open on MCP Apps, where the polyfill renders the modal in
  // our own tree and is therefore verifiable. On Apps SDK the modal is
  // host-owned and a mounted view instance does NOT prove a usable modal
  // rendered, so we don't self-report it: the driver then answers the
  // confirmation "no" and the hook records unsupported.
  const modalOpen = detectRuntime() === "mcp-app";
  useStateBroadcast(() => ({
    run_complete: false,
    current_hook: null,
    action_button: null,
    confirm_question: null,
    modal_open: modalOpen,
    rows: [],
  }));
  return null;
}

function ModalNotice({ params }: { params?: Record<string, unknown> }) {
  return (
    <div className="flex max-w-sm flex-col gap-3 p-6">
      <h2 className="type-text-lg font-semibold text-foreground">
        Modal opened ✓
      </h2>
      <p className="type-text-sm text-muted-foreground">
        useRequestModal rendered this view in modal mode. Params received:
      </p>
      <code className="w-fit rounded-md bg-muted px-2 py-1 font-mono type-text-xs text-foreground">
        {JSON.stringify(params ?? {})}
      </code>
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
  const { theme, safeArea } = useLayout();
  const { isOpen, params } = useRequestModal();
  // A view born in modal mode is the host's dedicated modal instance (Apps
  // SDK): render the notice alone, never a runner.
  const bornInModal = useRef(isOpen).current;

  if (bornInModal) {
    return (
      <div
        className={`${theme === "dark" ? "dark " : ""}bg-background text-foreground`}
      >
        <StandaloneModalRemote />
        <ModalNotice params={params} />
      </div>
    );
  }

  // The runner is always mounted AND visible — never hidden on `isOpen`.
  // Coupling visibility to the modal flag bricked the run when a host left it
  // stuck: on Apps SDK `closeModal` is a no-op and the display store can stay
  // `mode: "modal"` after the modal test, so a hidden runner never came back
  // and every later step ran blind. On MCP Apps the host's ModalProvider frames
  // this view as the modal on its own; we don't need a second treatment.
  return (
    <div
      className={`${theme === "dark" ? "dark " : ""}bg-background text-foreground`}
    >
      <div
        className="min-h-dvh"
        style={{
          paddingTop: safeArea.insets.top,
          paddingBottom: safeArea.insets.bottom,
          paddingLeft: safeArea.insets.left,
          paddingRight: safeArea.insets.right,
        }}
      >
        <div className="mx-auto max-w-2xl p-4">
          <Runner />
        </div>
      </div>
    </div>
  );
}

export default App;
