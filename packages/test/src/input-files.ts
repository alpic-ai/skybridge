import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import type { FilePart, UserContent } from "ai";

interface FileReference {
  file_id: string;
  download_url: string;
  mime_type: string;
  file_name?: string;
}

const references = new WeakMap<FilePart, Set<FileReference>>();

export interface InputFileMatcher {
  asymmetricMatch(value: unknown): boolean;
  toString(): string;
  toJSON(): string;
}

export function inputFile(part: FilePart): InputFileMatcher {
  function matches(value: unknown): boolean {
    if (Array.isArray(value)) {
      return value.some(matches);
    }
    return [...(references.get(part) ?? [])].some((reference) => {
      if (typeof value === "string") {
        return value === reference.file_id || value === reference.download_url;
      }
      return (
        value !== null &&
        typeof value === "object" &&
        "file_id" in value &&
        "download_url" in value &&
        value.file_id === reference.file_id &&
        value.download_url === reference.download_url
      );
    });
  }
  const label = () =>
    `inputFile(${part.filename ?? part.mediaType}: ${[...(references.get(part) ?? [])].map((reference) => reference.file_id).join(", ") || "not sent"})`;
  return { asymmetricMatch: matches, toString: label, toJSON: label };
}

async function fileBytes(data: FilePart["data"]): Promise<Buffer> {
  if (data instanceof URL) {
    const response = await fetch(data);
    if (!response.ok) {
      throw new Error(`Input file download failed (HTTP ${response.status})`);
    }
    return Buffer.from(await response.arrayBuffer());
  }
  if (typeof data === "string") {
    if (data.startsWith("data:")) {
      return fileBytes(new URL(data));
    }
    return Buffer.from(data, "base64");
  }
  if (data instanceof ArrayBuffer) {
    return Buffer.from(data);
  }
  if (data instanceof Uint8Array) {
    return Buffer.from(data);
  }
  if (data.type === "data") {
    return fileBytes(data.data);
  }
  if (data.type === "url") {
    return fileBytes(new URL(data.url));
  }
  if (data.type === "text" && typeof data.text === "string") {
    return Buffer.from(data.text);
  }
  throw new Error(
    "Input files need bytes, text, or a URL; provider-only file references cannot be downloaded by the eval app",
  );
}

export class InputFiles {
  private readonly files = new Map<
    string,
    { reference: FileReference; bytes: Buffer }
  >();
  private readonly parts = new WeakMap<FilePart, FileReference>();
  private readonly server = createServer((request, response) => {
    const file = this.files.get(request.url?.slice(1) ?? "");
    if (!file) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { "Content-Type": file.reference.mime_type });
    response.end(file.bytes);
  });

  async prepare(content: UserContent): Promise<UserContent> {
    if (typeof content === "string") {
      return content;
    }
    const prepared: Exclude<UserContent, string> = [];
    for (const part of content) {
      if (part.type !== "file") {
        prepared.push(part);
        continue;
      }
      let reference = this.parts.get(part);
      if (!reference) {
        const bytes = await fileBytes(part.data);
        if (!this.server.listening) {
          await new Promise<void>((resolve, reject) => {
            this.server.once("error", reject);
            this.server.listen(0, "127.0.0.1", () => {
              this.server.off("error", reject);
              this.server.unref();
              resolve();
            });
          });
        }
        const address = this.server.address();
        if (!address || typeof address === "string") {
          throw new Error("Input file server did not open a local port");
        }
        const file_id = `file_${randomUUID()}`;
        reference = {
          file_id,
          download_url: `http://127.0.0.1:${address.port}/${file_id}`,
          mime_type: part.mediaType,
          ...(part.filename === undefined ? {} : { file_name: part.filename }),
        };
        this.files.set(file_id, { reference, bytes });
        this.parts.set(part, reference);
        const known = references.get(part) ?? new Set<FileReference>();
        known.add(reference);
        references.set(part, known);
      }
      prepared.push(
        {
          type: "text",
          text: `Attached file: ${JSON.stringify(reference)}. For openai/fileParams fields, pass its file_id; for plain URL fields, pass its download_url.`,
        },
        part,
      );
    }
    return prepared;
  }

  rewrite(input: Record<string, unknown>, fields: string[]) {
    const rewritten = { ...input };
    const resolve = (value: unknown): unknown => {
      if (typeof value !== "string") {
        return value;
      }
      const file = this.files.get(value);
      if (!file) {
        throw new Error(`Unknown input file id: ${value}`);
      }
      return file.reference;
    };
    for (const field of fields) {
      if (field in rewritten) {
        const value = rewritten[field];
        rewritten[field] = Array.isArray(value)
          ? value.map(resolve)
          : resolve(value);
      }
    }
    return rewritten;
  }

  async close() {
    if (this.server.listening) {
      await new Promise<void>((resolve, reject) => {
        this.server.close((error) => (error ? reject(error) : resolve()));
      });
    }
    this.files.clear();
  }
}
