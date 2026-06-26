import { cn } from "@alpic-ai/ui/lib/cn";
import type { HTMLAttributes, ReactNode } from "react";
import type { Support } from "@/conformance/types.js";

/** A labelled block: small uppercase caption above its value. */
export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="type-text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

/** Inline monospace token. */
export function Code({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <code
      className={cn(
        "w-fit rounded-md bg-muted px-2 py-1 type-text-sm font-mono text-foreground",
        className,
      )}
    >
      {children}
    </code>
  );
}

/** Multi-line monospace block (wraps + scrolls). */
export function CodeBlock({ children }: { children: ReactNode }) {
  return (
    <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-muted p-3 type-text-sm font-mono text-foreground">
      {children}
    </pre>
  );
}

/** Vertical stack with consistent spacing — the body of a check. */
export function Stack({
  children,
  className,
  ...rest
}: {
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col gap-3", className)} {...rest}>
      {children}
    </div>
  );
}

/** Lead paragraph describing what a check exercises. */
export function Description({ children }: { children: ReactNode }) {
  return <p className="type-text-sm text-muted-foreground">{children}</p>;
}

const SUPPORT_STYLE: Record<Support, { label: string; className: string }> = {
  supported: {
    label: "Supported",
    className:
      "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  },
  unsupported: {
    label: "Unsupported",
    className:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-400",
  },
  error: {
    label: "Error",
    className: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  },
  untested: {
    label: "Untested",
    className:
      "bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-400",
  },
};

/** Coloured support badge. */
export function SupportBadge({
  support,
  className,
}: {
  support: Support;
  className?: string;
}) {
  const style = SUPPORT_STYLE[support];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 type-text-xs font-medium",
        style.className,
        className,
      )}
    >
      {style.label}
    </span>
  );
}

/** Small neutral tag (e.g. the API name or check kind). */
export function Tag({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 type-text-xs font-mono text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}
