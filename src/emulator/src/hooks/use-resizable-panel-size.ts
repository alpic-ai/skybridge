import { useLocalStorageState } from "ahooks";
import { useCallback } from "react";

/**
 * Hook to manage resizable panel size with localStorage persistence
 * Converts between percentage (used by react-resizable-panels) and stored value
 */
export function useResizablePanelSize({
  key,
  defaultSizePercent,
  minSizePercent = 10,
  maxSizePercent = 90,
}: {
  key: string;
  defaultSizePercent: number;
  minSizePercent?: number;
  maxSizePercent?: number;
}) {
  const [size, setSize] = useLocalStorageState<number>(key, {
    defaultValue: Math.max(
      minSizePercent,
      Math.min(maxSizePercent, defaultSizePercent),
    ),
  });

  const handleResize = useCallback(
    (sizePercent: number) => {
      const clampedSize = Math.max(
        minSizePercent,
        Math.min(maxSizePercent, sizePercent),
      );
      setSize(clampedSize);
    },
    [minSizePercent, maxSizePercent, setSize],
  );

  return {
    size: Math.max(minSizePercent, Math.min(maxSizePercent, size ?? defaultSizePercent)),
    onResize: handleResize,
  };
}
