import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import type { FilePart, UserContent } from "ai";
import type { FileRef } from "skybridge/server";
import { registerInputFile } from "./matchers/matchers.js";

async function fileBytes(data: FilePart["data"]): Promise<Buffer> {
  if (data instanceof URL) {
    const response = await fetch(data);
    if (!response.ok) {
      throw new Error(`Input file download failed (HTTP ${response.status})`);
    }
    return Buffer.from(await response.arrayBuffer());
  }
  if (typeof data === "string") {
    return data.startsWith("data:")
      ? fileBytes(new URL(data))
      : Buffer.from(data, "base64");
  }
  if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
    return Buffer.from(new Uint8Array(data));
  }
  if (data.type === "data") {
    return fileBytes(data.data);
  }
  if (data.type === "url") {
    return fileBytes(new URL(data.url));
  }
  if (data.type === "text") {
    return Buffer.from(data.text);
  }
  throw new Error(
    "Input files need bytes, text, or a URL; provider-only file references cannot be downloaded by the eval app",
  );
}

export class InputFiles {
  private readonly files = new Map<
    string,
    { reference: FileRef; bytes: Buffer }
  >();
  private readonly paths = new Map<string, FileRef>();
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
      const bytes = await fileBytes(part.data);
      if (!this.server.listening) {
        this.server.listen(0, "127.0.0.1").unref();
        await once(this.server, "listening");
      }
      const { port } = this.server.address() as AddressInfo;
      const id = randomUUID();
      const file_id = `file_${id}`;
      const reference = {
        file_id,
        download_url: `http://127.0.0.1:${port}/${file_id}`,
        mime_type: part.mediaType,
        ...(part.filename === undefined ? {} : { file_name: part.filename }),
      };
      const uploaded_name = part.filename ?? "input";
      const workspace_path = `/workspace/scratch/${id}/upload/${uploaded_name}`;
      this.files.set(file_id, { reference, bytes });
      this.paths.set(workspace_path, reference);
      registerInputFile(reference, part);
      prepared.push(
        {
          type: "text",
          text: `Attached file: ${JSON.stringify({ uploaded_name, workspace_path })}`,
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
      const reference = this.paths.get(value);
      if (!reference) {
        throw new Error(`Unknown input file path: ${value}`);
      }
      return reference;
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
      this.server.close();
      await once(this.server, "close");
    }
  }
}
