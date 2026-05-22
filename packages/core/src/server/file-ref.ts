import { z } from "zod";

/**
 * Zod schema for a host-managed file reference passed between tools and views.
 *
 * Use it inside a tool's `inputSchema` or `outputSchema` so the host can
 * recognize the field as a file and surface attach / preview affordances.
 *
 * @example
 * ```ts
 * server.registerTool({
 *   name: "summarize-document",
 *   inputSchema: { document: FileRef },
 * }, async ({ document }) => {
 *   const res = await fetch(document.download_url);
 *   // …
 * });
 * ```
 *
 * @see https://docs.skybridge.tech/api-reference/file-ref
 */
export const FileRef = z.object({
  file_id: z.string(),
  download_url: z.string(),
  mime_type: z.string().optional(),
  file_name: z.string().optional(),
});

/** Inferred TypeScript type for {@link FileRef}. */
export type FileRef = z.infer<typeof FileRef>;
