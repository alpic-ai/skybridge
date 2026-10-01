import { useCallback } from "react";
import { getAdaptor } from "../bridges/index.js";

/**
 * Ask ChatGPT to open a local file by its absolute path, through the OpenAI
 * MCP extensions (`openai/files/open`). ChatGPT desktop only, and only when
 * the server runs on the same machine. Rejects with `NotSupportedError` on
 * hosts that don't advertise `openai/files`: check `useHost().openai.files`
 * before showing the control.
 *
 * @example
 * ```tsx
 * const { openai } = useHost();
 * const openFile = useOpenFile();
 * if (openai.files) {
 *   return <button onClick={() => openFile(part.path)}>Open in ChatGPT</button>;
 * }
 * ```
 *
 * @see https://docs.skybridge.tech/api-reference/use-open-file
 */
export function useOpenFile(): (path: string) => Promise<void> {
  return useCallback((path: string) => getAdaptor().openFile(path), []);
}
