import { getAdaptor } from "../bridges/index.js";

export function useFiles() {
  const adaptor = getAdaptor();
  return {
    upload: adaptor.uploadFile,
    getDownloadUrl: adaptor.getFileDownloadUrl,
  };
}
