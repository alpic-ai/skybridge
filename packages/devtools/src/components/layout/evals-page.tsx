import { Button } from "@alpic-ai/ui/components/button";
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLinkIcon,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import { PrismLight } from "react-syntax-highlighter";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import { useCopyToClipboard } from "@/lib/copy.js";
import { useEvalsPage } from "@/lib/nuqs.js";
import { cn } from "@/lib/utils.js";
import { devtoolsJsonPrismTheme } from "./tool-panel/json-syntax-theme.js";

PrismLight.registerLanguage("typescript", typescript);

const DOCS_URL = "https://docs.skybridge.tech/test/evals";

const EXAMPLE = `import { anthropic } from "@ai-sdk/anthropic";
import { start } from "@skybridge/test";
import { expect, it } from "vitest";
import { app } from "../src/server.js";

it("reaches the search tool from a natural prompt", async () => {
  const chat = await start({ app, model: anthropic("claude-sonnet-4-5") });
  await chat.send("Find me running shoes under 100 dollars");

  expect.chat(chat).toHaveCalledToolWith("search-products", {
    query: "running shoes",
  });
});`;

const SETUP_PROMPT = `First, make sure the Skybridge skill is installed and up to date:

npx skills add alpic-ai/skybridge -s skybridge

Then set up evals for this app, following the skill's evals reference.`;

function CodeCard({
  label,
  code,
  action,
  wrap,
  highlight,
}: {
  label: string;
  code: string;
  action?: ReactNode;
  wrap?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-lg border bg-background">
      <div className="flex items-center justify-between gap-3 border-b bg-light-gray px-4 py-2">
        <span className="text-xs font-medium text-light-gray-foreground">
          {label}
        </span>
        {action}
      </div>
      {highlight ? (
        <div className="overflow-x-auto px-4 py-3 text-xs leading-relaxed">
          <PrismLight
            language="typescript"
            style={devtoolsJsonPrismTheme}
            customStyle={{
              margin: 0,
              padding: 0,
              background: "transparent",
              fontSize: "0.75rem",
            }}
            codeTagProps={{ className: "font-mono whitespace-pre" }}
          >
            {code}
          </PrismLight>
        </div>
      ) : (
        <pre
          className={cn(
            "overflow-x-auto px-4 py-3 font-mono text-xs leading-relaxed",
            wrap && "whitespace-pre-wrap",
          )}
        >
          {code}
        </pre>
      )}
    </div>
  );
}

function PromptCard() {
  const { copied, copy } = useCopyToClipboard();
  return (
    <CodeCard
      label="Paste this to your coding agent"
      code={SETUP_PROMPT}
      wrap
      action={
        <Button variant="cta" onClick={() => copy(SETUP_PROMPT)}>
          {copied ? (
            <Check className="size-3.5" />
          ) : (
            <Copy className="size-3.5" />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
      }
    />
  );
}

export function EvalsPage() {
  const [, setOpen] = useEvalsPage();
  return (
    <div className="relative min-h-0 overflow-y-auto bg-background">
      <div
        className="preview-region evals-grid-fade pointer-events-none absolute inset-0"
        aria-hidden
      />
      <div
        className="evals-wash pointer-events-none absolute inset-0"
        aria-hidden
      />

      <div className="relative mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10">
        <Button
          variant="tertiary"
          className="self-start"
          onClick={() => setOpen(null)}
        >
          <ArrowLeft className="size-3.5" />
          Back
        </Button>

        <div className="space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs text-light-gray-foreground">
            <Sparkles className="size-3.5" aria-hidden />
            Evals
          </span>
          <h1 className="text-2xl font-medium">
            Check what the model does with your app, in a test
          </h1>
          <p className="text-sm text-muted-foreground">
            A tool that works is not the same as a tool the model decides to
            call. An eval runs a real conversation against your app and asserts
            on the tools it reached for, so you catch a change that quietly
            breaks discovery.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-medium">What an eval looks like</h2>
          <CodeCard label="evals/search.eval.ts" code={EXAMPLE} highlight />
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-medium">Getting started</h2>
          <PromptCard />
        </div>

        <Button asChild variant="tertiary" className="self-start">
          <a href={DOCS_URL} target="_blank" rel="noreferrer noopener">
            <ExternalLinkIcon className="size-3.5" />
            Read the evals docs
          </a>
        </Button>
      </div>
    </div>
  );
}
