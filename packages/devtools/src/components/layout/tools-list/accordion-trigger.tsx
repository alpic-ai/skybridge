import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronRightIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils.js";

export type AccordionTriggerProps = ComponentProps<
  typeof AccordionPrimitive.Trigger
> & {
  action?: ReactNode;
};

// AccordionTrigger diverges from alpic-ai/ui implementation
// Chevron icon is placed on the left side and is pointing to the right
// `action` renders as a sibling of the trigger to avoid nested <button> elements
export function AccordionTrigger({
  className,
  children,
  action,
  ...props
}: AccordionTriggerProps) {
  return (
    <AccordionPrimitive.Header className="flex w-full min-w-0 items-stretch data-[state=open]:sticky data-[state=open]:top-0 data-[state=open]:z-20 data-[state=open]:bg-background">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "flex min-h-0 min-w-0 flex-1 items-center gap-2 pl-4 pr-2 py-2.5 h-12",
          "type-text-md font-semibold text-foreground text-left",
          "outline-none focus-visible:outline-none rounded-sm",
          "disabled:pointer-events-none disabled:opacity-50",
          "data-[state=open]:cursor-default",
          "[&[data-state=open]>svg]:rotate-90",
          className,
        )}
        {...props}
      >
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform duration-200" />
        {children}
      </AccordionPrimitive.Trigger>
      {action != null ? (
        <div className="flex shrink-0 items-center pr-4">{action}</div>
      ) : null}
    </AccordionPrimitive.Header>
  );
}
