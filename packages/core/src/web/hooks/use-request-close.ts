import { useCallback } from "react";
import { getAdaptor } from "../bridges/index.js";

export type RequestCloseFn = () => Promise<void>;

export function useRequestClose(): RequestCloseFn {
  const adaptor = getAdaptor();
  const requestClose = useCallback(() => adaptor.requestClose(), [adaptor]);

  return requestClose;
}
