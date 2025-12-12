import { type RefObject, useCallback, useEffect, useState } from "react";
import { useLocalStorageState } from "ahooks";

export const useResize = ({
  key,
  defaultSize,
  minSize,
  maxSize,
  containerRef,
  direction = "horizontal",
}: {
  key: string;
  defaultSize: number;
  minSize: number;
  maxSize: number;
  containerRef?: RefObject<HTMLElement | null>;
  direction?: "horizontal" | "vertical";
}) => {
  const [size, setSize] = useLocalStorageState(key, {
    defaultValue: Math.max(minSize, Math.min(maxSize, defaultSize)),
  });
  const [isResizing, setIsResizing] = useState(false);
  const [startPos, setStartPos] = useState(0);
  const [startSize, setStartSize] = useState(0);
  const isVertical = direction === "vertical";

  const handleSetSize = useCallback(
    (newSize: number) => {
      setSize(Math.max(minSize, Math.min(maxSize, newSize)));
    },
    [minSize, maxSize, setSize],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      let newSize: number;
      if (isVertical) {
        // For vertical resizing, calculate delta from start position
        const delta = startPos - e.clientY; // Positive when dragging up
        newSize = startSize + delta;
      } else {
        // For horizontal resizing, calculate from container left
        if (containerRef?.current) {
          const containerRect = containerRef.current.getBoundingClientRect();
          newSize = e.clientX - containerRect.left;
        } else {
          newSize = e.clientX;
        }
      }

      handleSetSize(newSize);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = isVertical ? "row-resize" : "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, handleSetSize, containerRef, isVertical, startPos, startSize]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isVertical) {
      setStartPos(e.clientY);
      setStartSize(size);
    }
    setIsResizing(true);
  };

  return {
    size,
    isResizing,
    handleMouseDown,
  };
};
