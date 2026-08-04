import { WarningAlert } from "@alpic-ai/ui/components/alert";
import { Badge } from "@alpic-ai/ui/components/badge";

const tokenFormatter = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

type ContextWarningKind = "tool-output" | "view-state";

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
  return (
    <WarningAlert
      className="shrink-0 rounded-none border-x-0 border-t-0 px-3 py-2"
      title={`${copy.title} (~${tokenFormatter.format(tokenCount)} tokens)`}
      description={copy.description}
    />
  );
}
