import { cn } from "@/lib/utils";

interface ResizeHandleProps {
  isResizing: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  className?: string;
  style?: React.CSSProperties;
  direction?: "horizontal" | "vertical";
}

export function ResizeHandle({
  isResizing,
  onMouseDown,
  className,
  style,
  direction = "horizontal",
}: ResizeHandleProps) {
  const isVertical = direction === "vertical";

  return (
    <div
      className={cn(
        "absolute transition-colors",
        isVertical
          ? "left-0 right-0 h-1 cursor-row-resize"
          : "top-0 bottom-0 w-1 cursor-col-resize",
        "hover:bg-primary/20 active:bg-primary/40",
        isResizing && "bg-primary/40",
        className,
      )}
      onMouseDown={onMouseDown}
      style={{ touchAction: "none", ...style }}
    />
  );
}
