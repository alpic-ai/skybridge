import { useCallback } from "react";
import { getAdaptor } from "../bridges/index.js";
import type { OpenExternalOptions } from "../bridges/types.js";

export type OpenExternalFn = (
  href: string,
  options?: OpenExternalOptions,
) => void;

export function useOpenExternal(): OpenExternalFn {
  const adaptor = getAdaptor();
  const openExternal = useCallback(
    (href: string, options?: OpenExternalOptions) =>
      adaptor.openExternal(href, options),
    [adaptor],
  );

  return openExternal;
}
