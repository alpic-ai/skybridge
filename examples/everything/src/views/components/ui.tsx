import { cn } from "@alpic-ai/ui/lib/cn";
import type { HTMLAttributes, ReactNode } from "react";

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

/** Standard tab body: vertical stack with consistent spacing. */
export function TabBody({
  children,
  className,
  ...rest
}: {
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col gap-4", className)} {...rest}>
      {children}
    </div>
  );
}

/** Lead paragraph describing what a tab demonstrates. */
export function Description({ children }: { children: ReactNode }) {
  return <p className="type-text-sm text-muted-foreground">{children}</p>;
}
