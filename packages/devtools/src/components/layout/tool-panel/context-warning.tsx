import { WarningAlert } from "@alpic-ai/ui/components/alert";
import { Badge } from "@alpic-ai/ui/components/badge";
import { X } from "lucide-react";
import { useState } from "react";

const tokenFormatter = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

type ContextWarningKind = "tool-output" | "view-state";

const getDismissedWarningKey = (kind: ContextWarningKind) =>
  `skybridge-devtools-dismissed-${kind}-warning`;

const warningCopy = {
  "tool-output": {
    badge: "Large response",
    title: "Large model-visible output",
    description:
      "Content and structured content count toward this estimate. Large responses can consume significant context or exceed limits in some clients and models.",
  },
  "view-state": {
    badge: "Large context",
    title: "Large model-visible view state",
    description:
      "Persisted view state and data-llm context count toward this estimate. Keep only content the model needs.",
  },
} satisfies Record<
  ContextWarningKind,
  { badge: string; title: string; description: string }
>;

export function ContextWarningBadge({ kind }: { kind: ContextWarningKind }) {
  return (
    <Badge size="sm" variant="warning">
      {warningCopy[kind].badge}
    </Badge>
  );
}

export function ContextWarningAlert({
  kind,
  tokenCount,
}: {
  kind: ContextWarningKind;
  tokenCount: number;
}) {
  const copy = warningCopy[kind];
  const [isDismissed, setIsDismissed] = useState(
    () => sessionStorage.getItem(getDismissedWarningKey(kind)) === "true",
  );

  if (isDismissed) {
    return null;
  }

  const dismiss = () => {
    sessionStorage.setItem(getDismissedWarningKey(kind), "true");
    setIsDismissed(true);
  };

  return (
    <div className="relative shrink-0">
      <WarningAlert
        className="rounded-none border-x-0 border-t-0 py-2 pl-3 pr-10"
        title={`${copy.title} (~${tokenFormatter.format(tokenCount)} tokens)`}
        description={copy.description}
      />
      <button
        type="button"
        aria-label={`Dismiss ${copy.badge.toLowerCase()} warning for this session`}
        onClick={dismiss}
        className="absolute right-2 top-2 inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-badge-warning/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
