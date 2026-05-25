import { useCallback } from "react";
import { getAdaptor } from "../bridges/index.js";
import type { DownloadParams, DownloadResult } from "../bridges/types.js";

export type DownloadFn = (params: DownloadParams) => Promise<DownloadResult>;

export function useDownload(): { download: DownloadFn } {
  const adaptor = getAdaptor();
  const download = useCallback<DownloadFn>(
    (params) => adaptor.download(params),
    [adaptor],
  );

  return { download };
}
