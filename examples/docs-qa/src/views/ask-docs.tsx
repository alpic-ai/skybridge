import "@/index.css";

import { ErrorAlert } from "@alpic-ai/ui/components/alert";
import { Button } from "@alpic-ai/ui/components/button";
import {
  BookOpen,
  ChevronDown,
  ExternalLink,
  LoaderCircle,
  Search,
} from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";
import { useLayout, useOpenExternal } from "skybridge/web";
import { useCallTool, useToolInfo } from "../helpers.js";

type Source = {
  id: number;
  title: string;
  section: string | null;
  url: string;
};

type Passage = { id: number; text: string; score: number };

// The answer is plain prose with two kinds of inline islands: [n] citations
// and `code` identifiers. Tokenizing on both lets citations render as
// interactive chips. Each token keeps its character offset as a stable key.
type Token =
  | { type: "text"; value: string; offset: number }
  | { type: "code"; value: string; offset: number }
  | { type: "cite"; id: number; offset: number };

function tokenizeAnswer(answer: string): Token[] {
  const tokens: Token[] = [];
  let last = 0;
  for (const match of answer.matchAll(/\[(\d+)\]|`([^`\n]+)`/g)) {
    if (match.index > last) {
      tokens.push({
        type: "text",
        value: answer.slice(last, match.index),
        offset: last,
      });
    }
    if (match[1] === undefined) {
      tokens.push({ type: "code", value: match[2], offset: match.index });
    } else {
      tokens.push({ type: "cite", id: Number(match[1]), offset: match.index });
    }
    last = match.index + match[0].length;
  }
  if (last < answer.length) {
    tokens.push({ type: "text", value: answer.slice(last), offset: last });
  }
  return tokens;
}

function breadcrumbFor(source: Source): string {
  return source.section ? `${source.title} › ${source.section}` : source.title;
}

function WidgetShell({
  theme,
  narration,
  children,
}: {
  theme: string | undefined;
  narration: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`${theme === "dark" ? "dark" : ""} bg-background text-foreground p-4`}
    >
      <div className="flex flex-col gap-3" data-llm={narration}>
        {children}
      </div>
    </div>
  );
}

function CitationChip({
  id,
  isSelected,
  onClick,
}: {
  id: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Show source ${id}`}
      className={`mx-0.5 inline-flex size-4 -translate-y-1 items-center justify-center rounded-full align-middle text-[10px] font-semibold transition-colors ${
        isSelected
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground [@media(hover:hover)]:hover:bg-primary/15 [@media(hover:hover)]:hover:text-primary"
      }`}
    >
      {id}
    </button>
  );
}

function Answer({
  answer,
  selectedSource,
  onSelectSource,
}: {
  answer: string;
  selectedSource: number | null;
  onSelectSource: (id: number) => void;
}) {
  return (
    <p className="type-text-sm leading-relaxed">
      {tokenizeAnswer(answer).map((token) => {
        const key = `${token.type}-${token.offset}`;
        if (token.type === "cite") {
          return (
            <CitationChip
              key={key}
              id={token.id}
              isSelected={selectedSource === token.id}
              onClick={() => onSelectSource(token.id)}
            />
          );
        }
        if (token.type === "code") {
          return (
            <code
              key={key}
              className="rounded bg-muted px-1 py-0.5 font-mono type-text-xs"
            >
              {token.value}
            </code>
          );
        }
        return <span key={key}>{token.value}</span>;
      })}
    </p>
  );
}

function SourceCard({
  source,
  passage,
  isOpen,
  onToggle,
  onOpenDocs,
}: {
  source: Source;
  passage: Passage | undefined;
  isOpen: boolean;
  onToggle: () => void;
  onOpenDocs: () => void;
}) {
  return (
    <li
      className="rounded-lg border border-border"
      data-llm={
        isOpen ? `Reading source [${source.id}] ${breadcrumbFor(source)}` : ""
      }
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 p-2 text-left [@media(hover:hover)]:hover:bg-muted/40"
      >
        <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
          {source.id}
        </span>
        <span className="min-w-0 flex-1 truncate type-text-xs font-medium">
          {breadcrumbFor(source)}
        </span>
        <ChevronDown
          className={`size-3.5 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="flex flex-col gap-2 border-t border-border p-2">
          <p className="max-h-40 overflow-y-auto whitespace-pre-wrap type-text-xs text-muted-foreground">
            {passage?.text ?? "Passage preview unavailable."}
          </p>
          <div className="flex items-center justify-between gap-2">
            {passage && (
              <span className="type-text-xs text-muted-foreground">
                similarity {passage.score.toFixed(2)}
              </span>
            )}
            <Button
              variant="secondary"
              className="w-fit"
              icon={<ExternalLink />}
              onClick={onOpenDocs}
            >
              Open in docs
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

function FollowUp({
  disabled,
  onAsk,
}: {
  disabled: boolean;
  onAsk: (question: string) => void;
}) {
  const [draft, setDraft] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const question = draft.trim();
    if (question && !disabled) {
      onAsk(question);
      setDraft("");
    }
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Ask a follow-up about Skybridge…"
        className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-1.5 type-text-sm outline-none transition-colors focus:border-primary"
      />
      <Button
        variant="secondary"
        className="w-fit shrink-0"
        icon={<Search />}
        disabled={disabled || draft.trim() === ""}
      >
        Ask
      </Button>
    </form>
  );
}

function Searching({ question }: { question: string | null }) {
  return (
    <div className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-4 text-center">
      <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
      <p className="type-text-sm text-muted-foreground">
        Searching the Skybridge docs…
      </p>
      {question && (
        <p className="max-w-full truncate type-text-xs text-muted-foreground">
          “{question}”
        </p>
      )}
    </div>
  );
}

export default function AskDocs() {
  const { theme } = useLayout();
  const openExternal = useOpenExternal();
  const {
    output,
    responseMetadata,
    isPending: isHostPending,
  } = useToolInfo<"ask-docs">();
  const {
    callTool,
    data,
    error: callError,
    isPending: isCalling,
  } = useCallTool("ask-docs");

  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<number | null>(null);

  // A follow-up asked from the widget wins over the result it mounted with.
  const result = data?.structuredContent ?? output;
  // `meta` is untyped on call results, so narrow it before use.
  const rawPassages = data?.meta?.passages ?? responseMetadata?.passages;
  const passages = Array.isArray(rawPassages) ? (rawPassages as Passage[]) : [];
  const sources = result?.sources ?? [];

  const busy = isHostPending || isCalling || pendingQuestion !== null;
  const errorMessage = callError
    ? callError instanceof Error
      ? callError.message
      : "The docs lookup failed."
    : result?.error;

  function ask(question: string) {
    setSelectedSource(null);
    setPendingQuestion(question);
    callTool({ question }, { onSettled: () => setPendingQuestion(null) });
  }

  function toggleSource(id: number) {
    setSelectedSource((current) => (current === id ? null : id));
  }

  const narration = busy
    ? "Searching the Skybridge docs"
    : result?.answer
      ? `Showing a cited answer to "${result.question}" with ${sources.length} sources`
      : "Waiting for a question about the Skybridge docs";

  return (
    <WidgetShell theme={theme} narration={narration}>
      {busy ? (
        <Searching question={pendingQuestion} />
      ) : (
        <>
          {errorMessage && (
            <ErrorAlert description={errorMessage} className="max-w-full" />
          )}
          {!errorMessage && result?.answer && (
            <>
              <Answer
                answer={result.answer}
                selectedSource={selectedSource}
                onSelectSource={toggleSource}
              />
              {sources.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="flex items-center gap-1.5 type-text-xs font-medium text-muted-foreground">
                    <BookOpen className="size-3.5" />
                    Sources
                  </p>
                  <ul className="flex max-h-56 list-none flex-col gap-1.5 overflow-y-auto">
                    {sources.map((source) => (
                      <SourceCard
                        key={source.id}
                        source={source}
                        passage={passages.find(
                          (passage) => passage.id === source.id,
                        )}
                        isOpen={selectedSource === source.id}
                        onToggle={() => toggleSource(source.id)}
                        onOpenDocs={() => openExternal(source.url)}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </>
      )}
      <FollowUp disabled={busy} onAsk={ask} />
    </WidgetShell>
  );
}
