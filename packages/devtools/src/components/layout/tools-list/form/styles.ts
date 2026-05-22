export const denseInputClass = [
  "h-7 w-full rounded-md border border-border bg-background",
  "px-2 font-mono text-xs text-foreground",
  "placeholder:text-muted-foreground/50",
  "outline-none transition-colors",
  "focus-visible:border-ring focus-visible:border-2",
  "aria-invalid:border-destructive",
  "disabled:cursor-not-allowed disabled:opacity-50",
].join(" ");

export const denseTextareaClass = [
  "block w-full min-h-20 resize-y rounded-md border border-border bg-background",
  "px-2 py-1.5 font-mono text-xs leading-5 text-foreground",
  "placeholder:text-muted-foreground/50",
  "outline-none transition-colors",
  "focus-visible:border-ring focus-visible:border-2",
  "aria-invalid:border-destructive",
  "disabled:cursor-not-allowed disabled:opacity-50",
].join(" ");

export const denseSelectTriggerClass = [
  "flex h-7 w-full items-center justify-between gap-2 rounded-md border border-border bg-background",
  "px-2 text-xs text-foreground",
  "outline-none transition-colors",
  "focus-visible:border-ring focus-visible:border-2",
  "aria-invalid:border-destructive",
  "data-[placeholder]:text-muted-foreground/50",
  "disabled:cursor-not-allowed disabled:opacity-50",
  "[&>span]:line-clamp-1",
].join(" ");

export const ghostButtonClass = [
  "inline-flex h-6 cursor-pointer items-center gap-1 rounded-md px-1.5",
  "font-mono text-xs text-muted-foreground",
  "transition-colors",
  "hover:bg-muted hover:text-foreground",
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
  "disabled:pointer-events-none disabled:opacity-50",
].join(" ");
