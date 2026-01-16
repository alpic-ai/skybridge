import { useCallback } from "react";
import { getAdaptor } from "../bridges/index.js";

export function useSetOpenInAppUrl() {
  const adaptor = getAdaptor();
  const setOpenInAppUrl = useCallback(
    (href: string) => adaptor.setOpenInAppUrl(href),
    [adaptor],
  );

  return setOpenInAppUrl;
}
