import { getAdaptor } from "../bridges/index.js";

/**
 * File operations bound to the current host: `upload` a `File`, resolve a
 * `downloadUrl` for an uploaded file, and `selectFiles` to open the host's
 * native file picker.
 *
 * Currently Apps-SDK-only — calling any of these from MCP Apps throws.
 * `selectFiles` additionally requires a ChatGPT host version that exposes the
 * picker; it throws if the capability is unavailable.
 *
 * `upload` returns `FileMetadata` (`fileId`, optional `fileName`, `mimeType`).
 * To pass an uploaded file to a tool whose input uses {@link FileRef}, first
 * call `getDownloadUrl` and then build the ref yourself — field names differ
 * (camelCase on the client, snake_case in the schema) and `download_url` is
 * required.
 *
 * @example
 * ```tsx
 * const { upload, getDownloadUrl } = useFiles();
 * const meta = await upload(file);
 * const { downloadUrl } = await getDownloadUrl(meta);
 * callTool({
 *   document: {
 *     file_id: meta.fileId,
 *     download_url: downloadUrl,
 *     file_name: meta.fileName,
 *     mime_type: meta.mimeType,
 *   },
 * });
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
