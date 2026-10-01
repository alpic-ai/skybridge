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
 * version, and then re-reads the latest one. It rejects with
 * `NotSupportedError` when the host doesn't advertise `openai/resource` or the
 * resource isn't writable.
 *
 * Pass `undefined` or an empty string as `uri` to do nothing, for example outside a file
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
  const [state, setState] = useState<{
    uri: string;
    resource?: FileResource;
    error?: unknown;
  }>();
  const sequence = useRef(0);
  const current = uri && state?.uri === uri ? state : undefined;
  const currentRef = useRef(current);
  currentRef.current = current;

  const read = useCallback(() => {
    if (!uri) {
      return;
    }
    const id = ++sequence.current;
    getAdaptor()
      .readResource(uri, representation)
      .then(
        (resource) => ({ resource, error: undefined }),
        (error: unknown) => ({ resource: undefined, error }),
      )
      .then(({ resource, error }) => {
        if (id === sequence.current) {
          setState((previous) => ({
            uri,
            resource:
              resource ??
              (previous?.uri === uri ? previous.resource : undefined),
            error,
          }));
        }
      });
  }, [uri, representation]);

  useEffect(() => {
    if (!uri) {
      return;
    }
    read();
    const stopWatching = getAdaptor().watchResource(uri, read);
    return () => {
      sequence.current++;
      stopWatching();
    };
  }, [uri, read]);

  const write = useCallback(
    async (content: FileResourceContent) => {
      const resource = currentRef.current?.resource;
      if (!uri || currentRef.current?.uri !== uri || !resource?.writable) {
        throw new NotSupportedError(
          "writeResource",
          "the resource is not loaded or not writable",
        );
      }
      const result = await getAdaptor().writeResource(
        uri,
        content,
        resource.etag,
      );
      if (result.outcome === "saved") {
        sequence.current++;
        setState((previous) =>
          previous?.uri === uri
            ? {
                uri,
                resource: {
                  ...content,
                  mimeType: resource.mimeType,
                  writable: resource.writable,
                  etag: result.etag,
                },
              }
            : previous,
        );
      } else if (
        result.outcome === "conflict" &&
        currentRef.current?.uri === uri
      ) {
        read();
      }
      return result;
    },
    [uri, read],
  );

  return {
    data: current?.resource,
    isLoading: Boolean(uri) && current === undefined,
    error: current?.error,
    write,
  };
}
