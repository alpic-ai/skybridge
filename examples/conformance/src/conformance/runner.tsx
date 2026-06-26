import { Button } from "@alpic-ai/ui/components/button";
import { Check, Copy, Download, RefreshCw, Send } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCallTool, useDownload } from "skybridge/web";
import { Code, Description, SupportBadge } from "@/views/components/ui.js";
import { MemberProvider, useConformance } from "./context.js";
import { HOOKS } from "./registry.js";
import { buildReport, countMembers, supportOf } from "./report.js";
import { DECIDED, type HookDef, type Member, type Support } from "./types.js";

const APP_VERSION = "0.0.1";
const SUPPORTS: Support[] = ["supported", "unsupported", "error", "untested"];

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

type FlatMember = { hook: HookDef; member: Member };

function flatten(kind: Member["kind"]): FlatMember[] {
  return HOOKS.flatMap((hook) =>
    hook.members
      .filter((m) => m.kind === kind)
      .map((member) => ({ hook, member })),
  );
}

/**
 * Runs the automated members. Read-only members stay mounted the whole time so
 * they re-report when host-delivered data (e.g. useToolInfo's tool input/output)
 * arrives after the first render. `serialized` members — the ones that write the
 * shared host `viewState` (useViewState / createStore) — run one at a time so
 * concurrent writers can't clobber each other.
 */
function AutoRunner({
  members,
  onDone,
}: {
  members: FlatMember[];
  onDone: () => void;
}) {
  const { results } = useConformance();
  const persistent = useMemo(
    () => members.filter((m) => !m.member.serialized),
    [members],
  );
  const serialized = useMemo(
    () => members.filter((m) => m.member.serialized),
    [members],
  );
  const [idx, setIdx] = useState(0);
  const current = serialized[idx];

  useEffect(() => {
    if (!current) {
      onDone();
      return;
    }
    const reported = Boolean(results[current.member.id]);
    const t = setTimeout(() => setIdx((i) => i + 1), reported ? 60 : 1500);
    return () => clearTimeout(t);
  }, [current, results, onDone]);

  return (
    <div hidden>
      {persistent.map(({ member }) => (
        <MemberProvider key={member.id} id={member.id}>
          <member.Test />
        </MemberProvider>
      ))}
      {current && (
        <MemberProvider key={current.member.id} id={current.member.id}>
          <current.member.Test />
        </MemberProvider>
      )}
    </div>
  );
}

function ManualStepper({ members }: { members: FlatMember[] }) {
  const { results } = useConformance();
  const [step, setStep] = useState(0);

  if (members.length === 0) {
    return null;
  }
  const i = Math.min(step, members.length - 1);
  const { hook, member } = members[i];
  const result = results[member.id];

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="type-text-lg font-semibold text-foreground">
          Manual tests
        </h2>
        <span className="type-text-sm text-muted-foreground">
          {i + 1} / {members.length}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Code>{hook.name}</Code>
        <span className="text-muted-foreground">→</span>
        <span className="type-text-sm font-semibold text-foreground">
          {member.name}
        </span>
        {result && <SupportBadge support={result.support} />}
      </div>
      <Description>{member.description}</Description>

      <MemberProvider id={member.id}>
        <member.Test />
      </MemberProvider>

      {result?.detail && (
        <p className="type-text-sm text-muted-foreground">{result.detail}</p>
      )}

      <nav className="flex justify-between pt-1">
        <Button
          variant="secondary"
          disabled={i === 0}
          onClick={() => setStep(i - 1)}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          disabled={i === members.length - 1}
          onClick={() => setStep(i + 1)}
        >
          Next
        </Button>
      </nav>
    </section>
  );
}

function Results() {
  const { results } = useConformance();
  return (
    <div className="flex flex-col gap-4">
      {HOOKS.map((hook) => (
        <section
          key={hook.name}
          className="rounded-xl border border-border bg-card p-4"
        >
          <div className="flex flex-wrap items-baseline gap-2">
            <h2 className="type-text-lg font-semibold text-foreground">
              {hook.name}
            </h2>
            <Code>{hook.source}</Code>
          </div>
          <p className="type-text-sm text-muted-foreground">{hook.summary}</p>
          <ul className="mt-3 flex flex-col divide-y divide-border">
            {hook.members.map((m) => {
              const support = supportOf(results, m.id);
              const detail = results[m.id]?.detail;
              return (
                <li key={m.id} className="flex flex-col gap-1.5 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <SupportBadge support={support} />
                    <span className="type-text-sm font-medium text-foreground">
                      {m.name}
                    </span>
                    {detail && (
                      <span className="type-text-xs text-muted-foreground">
                        {detail}
                      </span>
                    )}
                  </div>
                  {m.kind === "standalone" && (
                    <MemberProvider id={m.id}>
                      <m.Test />
                    </MemberProvider>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function Runner() {
  const { runtime, results } = useConformance();
  const autoMembers = useMemo(() => flatten("auto"), []);
  const manualMembers = useMemo(() => flatten("manual"), []);

  const [autoEpoch, setAutoEpoch] = useState(0);
  const [autoRunning, setAutoRunning] = useState(true);
  const onAutoDone = useCallback(() => setAutoRunning(false), []);

  const exportTool = useCallTool<{
    markdown: string;
    passed: number;
    failed: number;
    total: number;
    runtime: string;
  }>("export-report");
  const { download } = useDownload();
  const [copyState, setCopyState] = useState<"idle" | "ok">("idle");
  const [markdownView, setMarkdownView] = useState<string | null>(null);
  const [downloadState, setDownloadState] = useState<string | null>(null);

  const counts = useMemo(() => countMembers(HOOKS, results), [results]);
  const decided = DECIDED.reduce((sum, s) => sum + counts[s], 0);
  const autoDoneCount = autoMembers.filter((m) => results[m.member.id]).length;

  const makeReport = () =>
    buildReport({
      hooks: HOOKS,
      results,
      runtime,
      appVersion: APP_VERSION,
      generatedAt: new Date().toISOString(),
    });

  const rerun = () => {
    setAutoRunning(true);
    setAutoEpoch((e) => e + 1);
  };

  const sendToChat = () => {
    const report = makeReport();
    exportTool.callTool({
      markdown: report.markdown,
      passed: report.supported,
      failed: report.error,
      total: report.decided,
      runtime,
    });
  };

  const copyMarkdown = async () => {
    const { markdown } = makeReport();
    if (await copyText(markdown)) {
      setMarkdownView(null);
      setCopyState("ok");
      setTimeout(() => setCopyState("idle"), 2000);
    } else {
      // Clipboard is blocked in this host — reveal the report to copy manually.
      setMarkdownView(markdown);
    }
  };

  const downloadMarkdown = async () => {
    setDownloadState("Requesting…");
    try {
      const { isError } = await download({
        contents: [
          {
            type: "resource",
            resource: {
              uri: "file:///skybridge-conformance-report.md",
              mimeType: "text/markdown",
              text: makeReport().markdown,
            },
          },
        ],
      });
      setDownloadState(
        isError ? "Not available on this host" : "Download started",
      );
    } catch (e) {
      setDownloadState(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <AutoRunner key={autoEpoch} members={autoMembers} onDone={onAutoDone} />

      {/* Header */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="type-display-xs font-semibold text-foreground">
            Skybridge Web Hooks
          </h1>
          <span className="type-text-sm text-muted-foreground">
            runtime <Code>{runtime}</Code>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-baseline gap-2">
            <span className="type-display-sm font-bold text-foreground">
              {counts.supported}/{decided}
            </span>
            <span className="type-text-sm text-muted-foreground">
              members supported on this host
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SUPPORTS.map((s) => (
              <span key={s} className="inline-flex items-center gap-1">
                <SupportBadge support={s} />
                <span className="type-text-xs text-muted-foreground">
                  {counts[s]}
                </span>
              </span>
            ))}
          </div>
        </div>

        {autoRunning && (
          <p className="type-text-sm text-muted-foreground">
            Running automated tests… ({autoDoneCount}/{autoMembers.length})
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            icon={<RefreshCw />}
            disabled={autoRunning}
            onClick={rerun}
          >
            Re-run automated
          </Button>
          <Button
            variant="secondary"
            icon={<Send />}
            loading={exportTool.isPending}
            onClick={sendToChat}
          >
            Send report to chat
          </Button>
          <Button
            variant="secondary"
            icon={copyState === "ok" ? <Check /> : <Copy />}
            onClick={copyMarkdown}
          >
            {copyState === "ok" ? "Copied" : "Copy markdown"}
          </Button>
          <Button
            variant="secondary"
            icon={<Download />}
            onClick={downloadMarkdown}
          >
            Download .md
          </Button>
        </div>
        {downloadState && (
          <p className="type-text-xs text-muted-foreground">{downloadState}</p>
        )}
        {markdownView !== null && (
          <div className="flex flex-col gap-1">
            <p className="type-text-xs text-muted-foreground">
              Clipboard is blocked in this host — select all below and copy
              manually, or use Download / Send to chat.
            </p>
            <textarea
              readOnly
              value={markdownView}
              onFocus={(e) => e.currentTarget.select()}
              className="h-48 w-full rounded-md border border-border bg-muted p-2 font-mono type-text-xs text-foreground"
            />
          </div>
        )}
      </div>

      <ManualStepper members={manualMembers} />
      <Results />
    </div>
  );
}
