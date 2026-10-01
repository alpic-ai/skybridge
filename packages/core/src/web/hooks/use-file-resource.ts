import { useCallback, useEffect, useRef, useState } from "react";
import {
  type FileResource,
  type FileResourceContent,
  type FileResourceWriteResult,
  getAdaptor,
  NotSupportedError,
  type ResourceRepresentation,
} from "../bridges/index.js";

/** State and actions returned by {@link useFileResource}. */
export type FileResourceState = {
  data: FileResource | undefined;
  isLoading: boolean;
  error: unknown;
  write: (content: FileResourceContent) => Promise<FileResourceWriteResult>;
};

/**
 * Read a resource by URI, re-read it whenever the host reports a change, and
 * write it back. Built for the file a ChatGPT file entrypoint opened, whose
 * `resourceUri` arrives in the tool input as `file.resourceUri`.
 *
 * Reading uses the standard `resources/read`. `representation` asks ChatGPT
 * for text or a base64 blob. `write` uses the OpenAI MCP extensions
 * (`openai/resources/write`) and always sends the current `etag` as
 * `ifMatch`, so it resolves with `conflict` instead of overwriting a newer
 * version. It rejects with `NotSupportedError` when the host doesn't advertise
 * `openai/resource` or the resource isn't writable.
 *
 * Pass `undefined` as `uri` to do nothing, for example outside a file
 * entrypoint.
 *
 * @example
 * ```tsx
 * const { input } = useToolInfo<"open-part">();
 * const { data, write } = useFileResource(input.file?.resourceUri, {
 *   representation: "text",
 * });
 * ```
 *
 * @see https://docs.skybridge.tech/api-reference/use-file-resource
 */
export function useFileResource(
  uri: string | undefined,
  options?: { representation?: ResourceRepresentation },
): FileResourceState {
  const representation = options?.representation;
  const [data, setData] = useState<FileResource | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(uri !== undefined);
  const [error, setError] = useState<unknown>(undefined);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    setData(undefined);
    setError(undefined);
    if (uri === undefined) {
      setIsLoading(false);
      return;
    }
    let active = true;
    const adaptor = getAdaptor();
    const read = () => {
      setIsLoading(true);
      adaptor
        .readResource(uri, representation)
        .then((resource) => {
          if (active) {
            setData(resource);
            setError(undefined);
          }
        })
        .catch((err: unknown) => {
          if (active) {
            setError(err);
          }
        })
        .finally(() => {
          if (active) {
            setIsLoading(false);
          }
        });
    };
    read();
    const stopWatching = adaptor.watchResource(uri, read);
    return () => {
      active = false;
      stopWatching();
    };
  }, [uri, representation]);

  const write = useCallback(
    async (content: FileResourceContent) => {
      const current = dataRef.current;
      if (uri === undefined || !current?.writable) {
        throw new NotSupportedError(
          "writeResource",
          "the resource is not loaded or not writable",
        );
      }
      const result = await getAdaptor().writeResource(
        uri,
        content,
        current.etag,
      );
      if (result.outcome === "saved") {
        setData(
          (previous) =>
            previous && {
              ...content,
              mimeType: previous.mimeType,
              writable: previous.writable,
              etag: result.etag,
            },
        );
      }
      return result;
    },
    [uri],
  );

  return { data, isLoading, error, write };
}
