import { Check, Copy } from "lucide-react";
import {
  type MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils.js";

const COPIED_RESET_MS = 1500;

export function useCopyToClipboard() {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current) {
        clearTimeout(resetTimer.current);
      }
    },
    [],
  );

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (resetTimer.current) {
        clearTimeout(resetTimer.current);
      }
      resetTimer.current = setTimeout(() => setCopied(false), COPIED_RESET_MS);
    } catch (err) {
      console.error("Clipboard write failed", err);
    }
  }, []);

  return { copied, copy };
}

export function CopyButton({
  value,
  label,
  className,
  stopPropagation,
}: {
  value: string;
  label: string;
  className?: string;
  stopPropagation?: boolean;
}) {
  const { copied, copy } = useCopyToClipboard();
  const onClick = (e: MouseEvent) => {
    if (stopPropagation) {
      e.stopPropagation();
    }
    copy(value);
  };
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "text-quaternary-foreground hover:text-foreground",
        className,
      )}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  );
}
