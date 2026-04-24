import type {
  AudioContent,
  EmbeddedResource,
  ImageContent,
  ResourceLink,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";

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

export function text(
  value: string,
  annotations?: ContentAnnotations,
): TextContent {
  return { type: "text", text: value, ...(annotations && { annotations }) };
}

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
