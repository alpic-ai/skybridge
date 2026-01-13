import { useCallback } from "react";
import { getAdaptor } from "../bridges";

export function useOpenExternal() {
  const adaptor = getAdaptor();
  const openExternal = useCallback(
    (href: string) => adaptor.openExternal(href),
    [adaptor],
  );

  return openExternal;
}
