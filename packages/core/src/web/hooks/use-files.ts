import { getAdaptor } from "../bridges";

export function useFiles() {
  return getAdaptor().useFiles();
}
