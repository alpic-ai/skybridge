import { getAdaptor } from "../bridges";

export function useFiles() {
  const adaptor = getAdaptor();
  return {
    upload: adaptor.uploadFile,
    getDownloadUrl: adaptor.getFileDownloadUrl,
  };
}
