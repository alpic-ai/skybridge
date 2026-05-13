import { useCallback } from "react";
import { getAdaptor } from "../bridges/index.js";
import type { RequestSizeOptions } from "../bridges/types.js";

export type RequestSizeFn = (size: RequestSizeOptions) => Promise<void>;

export function useRequestSize(): RequestSizeFn {
  const adaptor = getAdaptor();
  const requestSize = useCallback(
    (size: RequestSizeOptions) => adaptor.requestSize(size),
    [adaptor],
  );

  return requestSize;
}
