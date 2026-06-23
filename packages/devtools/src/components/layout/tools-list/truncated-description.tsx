import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@alpic-ai/ui/components/dialog";
import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils.js";

// A description clamped to two lines. When it overflows, the text is cut so an
// inline "... more" link fits on the second line; clicking the link opens the
// full text in a scrollable dialog. Only the link is interactive.
//
// `className` styles the text (font/colour); any surrounding box/padding should
// be applied by a wrapper so the off-screen measurer matches the text width.
export function TruncatedDescription({
  text,
  title,
  className,
}: {
  text: string;
  title?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  // null → the text fits in two lines; otherwise the prefix to render before
  // the inline "... more" link.
  const [truncatedPrefix, setTruncatedPrefix] = useState<string | null>(null);
  const measureRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const el = measureRef.current;
    const container = el?.parentElement;
    if (!el || !container) {
      return;
    }
    // The measurer is clamped to two lines, so it fits when its full content
    // height doesn't exceed the clamped height.
    const fits = () => el.scrollHeight <= el.clientHeight + 1;
    const measure = () => {
      el.textContent = text;
      if (fits()) {
        setTruncatedPrefix(null);
        return;
      }
      // Largest prefix for which "<prefix>... more" still fits two lines.
      let lo = 0;
      let hi = text.length;
      let best = 0;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        el.textContent = `${text.slice(0, mid).trimEnd()}... more`;
        if (fits()) {
          best = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      setTruncatedPrefix(text.slice(0, best).trimEnd());
    };
    measure();
    // Re-measure when the available width changes (re-wraps the text).
    let lastWidth = -1;
    const observer = new ResizeObserver((entries) => {
      const width = Math.round(entries[0].contentRect.width);
      if (width === lastWidth) {
        return;
      }
      lastWidth = width;
      measure();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [text]);

  return (
    <>
      <div className={cn("relative", className)}>
        {/* Off-screen, two-line-clamped measurer used to find the cut point. */}
        <p
          ref={measureRef}
          aria-hidden="true"
          className="invisible absolute inset-x-0 top-0 line-clamp-2"
        />
        <p>
          {truncatedPrefix === null ? (
            text
          ) : (
            <>
              {truncatedPrefix}...{" "}
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="cursor-pointer p-0 underline underline-offset-2"
              >
                more
              </button>
            </>
          )}
        </p>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle className={title ? "font-mono" : "sr-only"}>
              {title ?? "Description"}
            </DialogTitle>
            <DialogDescription className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap">
              {text}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
