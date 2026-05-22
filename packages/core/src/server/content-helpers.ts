import type {
  AudioContent,
  EmbeddedResource,
  ImageContent,
  ResourceLink,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";

/**
 * MCP content annotations applied to any returned block.
 *
 * - `audience` — who is meant to see the content (`"user"`, `"assistant"`, or both).
 * - `priority` — relative importance hint for the host.
 * - `lastModified` — ISO timestamp for when the content was produced.
 */
type ContentAnnotations = {
  audience?: ("user" | "assistant")[];
  priority?: number;
  lastModified?: string;
};

/**
 * Returns a base64-encoded string.
 * - `Uint8Array` input is encoded via `Buffer.toString("base64")`.
 * - `string` input is assumed to be **already base64-encoded** and is returned
 *   as-is. Passing raw/unencoded string bytes will produce invalid MCP content.
 */
function toBase64(data: string | Uint8Array): string {
  if (typeof data === "string") {
    return data;
  }
  return Buffer.from(data).toString("base64");
}

/**
 * Build an MCP text content block.
 *
 * @example
 * ```ts
 * return { content: [text("Found 3 results.")] };
 * ```
 */
export function text(
  value: string,
  annotations?: ContentAnnotations,
): TextContent {
  return { type: "text", text: value, ...(annotations && { annotations }) };
}

/**
 * Build an MCP image content block.
 *
 * `data` may be a `Uint8Array` (encoded to base64 for you) or a string that is
 * **already base64-encoded**. Passing a raw byte-string will produce invalid
 * content.
 */
export function image(
  data: string | Uint8Array,
  mimeType: string,
  annotations?: ContentAnnotations,
): ImageContent {
  return {
    type: "image",
    data: toBase64(data),
    mimeType,
    ...(annotations && { annotations }),
  };
}

/**
 * Build an MCP audio content block.
 *
 * `data` may be a `Uint8Array` (encoded to base64 for you) or a string that is
 * **already base64-encoded**.
 */
export function audio(
  data: string | Uint8Array,
  mimeType: string,
  annotations?: ContentAnnotations,
): AudioContent {
  return {
    type: "audio",
    data: toBase64(data),
    mimeType,
    ...(annotations && { annotations }),
  };
}

/**
 * Build an MCP embedded resource — the full content travels inline. Use this
 * when the client needs the bytes themselves rather than a link.
 *
 * Pass either `text` (UTF-8 string) or `blob` (base64-encoded bytes).
 */
export function embeddedResource(
  resource:
    | { uri: string; mimeType?: string; text: string }
    | { uri: string; mimeType?: string; blob: string },
  annotations?: ContentAnnotations,
): EmbeddedResource {
  return {
    type: "resource",
    resource,
    ...(annotations && { annotations }),
  };
}

/**
 * Build an MCP resource link — a `type: "resource_link"` block carrying a URI
 * the client can fetch (or subscribe to) on demand. Use a link when the
 * client should retrieve the bytes itself; use {@link embeddedResource} when
 * the content must travel inline with the response.
 */
export function resourceLink(
  link: {
    uri: string;
    name: string;
    title?: string;
    description?: string;
    mimeType?: string;
    size?: number;
  },
  annotations?: ContentAnnotations,
): ResourceLink {
  return {
    type: "resource_link",
    ...link,
    ...(annotations && { annotations }),
  };
}
