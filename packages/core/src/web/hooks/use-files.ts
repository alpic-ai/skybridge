import { getAdaptor } from "../bridges/index.js";

/**
 * File operations bound to the current host: `upload` a `File`, resolve a
 * `downloadUrl` for an uploaded file, and `selectFiles` to open the host's
 * native file picker.
 *
 * Currently Apps-SDK-only — calling any of these from MCP Apps throws.
 * `selectFiles` additionally requires a ChatGPT host version that exposes the
 * picker; it throws if the capability is unavailable. Uploaded files are
 * returned as metadata you can hand back to a tool (compatible with {@link FileRef}).
 *
 * @example
 * ```tsx
 * const { upload, selectFiles } = useFiles();
 * const files = await selectFiles();
 * const ref = await upload(files[0]);
 * callTool({ fileId: ref.fileId });
 * ```
 *
 * @see https://docs.skybridge.tech/api-reference/use-files
 */
export function useFiles() {
  const adaptor = getAdaptor();
  return {
    upload: adaptor.uploadFile,
    getDownloadUrl: adaptor.getFileDownloadUrl,
    selectFiles: adaptor.selectFiles,
  };
}
