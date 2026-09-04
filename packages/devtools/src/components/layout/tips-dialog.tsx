import { Button } from "@alpic-ai/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@alpic-ai/ui/components/dialog";
import { StatusDot } from "@alpic-ai/ui/components/status-dot";
import { TooltipIconButton } from "@alpic-ai/ui/components/tooltip-icon-button";
import { ExternalLinkIcon } from "lucide-react";
import { useState } from "react";

type TipLink = { label: string; href: string };

type Tip = {
  id: string;
  title: string;
  body: string;
  /** Caveat rendered below the body, for experimental or gated features. */
  note?: string;
  links: readonly TipLink[];
};

const TIPS: readonly Tip[] = [
  {
    id: "webmcp",
    title: "Drive DevTools from your coding agent",
    body: "DevTools exposes its actions as WebMCP tools. An agent driving your browser through chrome-devtools-mcp can run a tool, screenshot the rendered view, and fix what is wrong — without you touching DevTools.",
    note: "WebMCP is experimental and requires Chrome 149 or newer.",
    links: [
      {
        label: "Set it up",
        href: "https://docs.skybridge.tech/test/devtools#set-it-up",
      },
      {
        label: "What is WebMCP?",
        href: "https://www.webfuse.com/blog/what-is-webmcp-the-practical-guide-to-the-web-model-context-protocol",
      },
    ],
  },
];

function TipCard({ tip }: { tip: Tip }) {
  return (
    <section className="rounded-lg border border-border bg-light-gray p-4">
      <h3 className="font-medium text-sm">{tip.title}</h3>
      <p className="mt-1.5 text-muted-foreground text-sm leading-relaxed">
        {tip.body}
      </p>
      {tip.note && (
        <p className="mt-2 text-quaternary-foreground text-xs">{tip.note}</p>
      )}
      <div className="-mx-2 mt-3 flex flex-wrap items-center gap-1">
        {tip.links.map((link) => (
          <Button key={link.href} asChild variant="tertiary">
            <a href={link.href} target="_blank" rel="noreferrer noopener">
              <ExternalLinkIcon className="size-3.5" />
              {link.label}
            </a>
          </Button>
        ))}
      </div>
    </section>
  );
}

export function TipsButton() {
  const [open, setOpen] = useState(false);
  // Deliberately not persisted: DevTools is a local tool that gets restarted
  // constantly, and the dot is cheap to re-show. Keeping it in memory means a
  // newly added tip is surfaced on the next run without a store migration.
  const [seen, setSeen] = useState(false);

  const onOpenChange = (next: boolean) => {
    if (next) {
      setSeen(true);
    }
    setOpen(next);
  };

  return (
    <>
      <TooltipIconButton
        tooltip="Tips"
        variant="tertiary"
        className="relative"
        onClick={() => onOpenChange(true)}
      >
        {/* The button already carries its accessible name via `tooltip`.
            Sized above the usual size-3.5 because the artwork carries a lot of
            internal padding, so it reads smaller than a Lucide icon would. */}
        <img src="/lightbulb.svg" alt="" aria-hidden className="size-5" />
        {!seen && (
          <StatusDot
            data-testid="tips-unseen"
            variant="warning"
            className="absolute top-1 right-1 size-1.5"
            aria-hidden
          />
        )}
      </TooltipIconButton>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Tips</DialogTitle>
            <DialogDescription>
              Features of DevTools that are easy to miss.
            </DialogDescription>
          </DialogHeader>
          {/* DialogContent only ships px-6; DialogHeader/Footer carry the
              vertical padding. There is no footer here, so close the bottom. */}
          <div className="space-y-3 overflow-y-auto pb-6">
            {TIPS.map((tip) => (
              <TipCard key={tip.id} tip={tip} />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
