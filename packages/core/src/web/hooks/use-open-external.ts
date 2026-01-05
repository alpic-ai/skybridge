import { useCallback } from "react";
import { useAdaptor } from "../bridges/index.js";

export function useOpenExternal() {
  const adaptor = useAdaptor();
  const openExternal = useCallback(
    (href: string) => adaptor.openExternal(href),
    [adaptor],
  );

  return openExternal;
}
