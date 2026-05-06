import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronRightIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils.js";

export type AccordionTriggerProps = ComponentProps<
  typeof AccordionPrimitive.Trigger
>;

// AccordionTrigger diverges from alpic-ai/ui implementation
// Chevron icon is placed on the left side and is pointing to the right
export function AccordionTrigger({
  className,
  children,
  ...props
}: AccordionTriggerProps) {
  return (
    <AccordionPrimitive.Header className="flex w-full min-w-0 items-stretch gap-2">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "flex min-h-0 min-w-0 flex-1 items-center gap-2 px-3 py-2.5 h-12",
          "type-text-md font-semibold text-foreground text-left",
          "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm",
          "disabled:pointer-events-none disabled:opacity-50",
          "[&[data-state=open]>svg]:rotate-90",
          className,
        )}
        {...props}
      >
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform duration-200" />
        {children}
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}
