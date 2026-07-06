import { Button } from "@alpic-ai/ui/components/button";
import { Input } from "@alpic-ai/ui/components/input";
import { useRef, useState } from "react";
import { type FileMetadata, useFiles } from "skybridge/web";
import { useCallTool } from "../../helpers.js";
import {
  Code,
  CodeBlock,
  Description,
  Field,
  TabBody,
} from "../components/ui.js";

export function UseFilesTab() {
  const { upload, selectFiles, getDownloadUrl } = useFiles();
  const { data, isPending, callTool } = useCallTool("inspect-file");
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setError(null);
    try {
      const metadata = await upload(file);
      setFiles((prev) => [metadata, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  async function handleSelect() {
    setError(null);
    try {
      const selected = await selectFiles();
      setFiles((prev) => [...selected, ...prev]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Library picker unavailable",
      );
    }
  }

  async function preview(file: FileMetadata) {
    const { downloadUrl } = await getDownloadUrl({ fileId: file.fileId });
    window.open(downloadUrl, "_blank");
  }

  async function inspect(file: FileMetadata) {
    // Build a FileRef from the upload metadata: field names differ
    // (camelCase here, snake_case in the schema) and download_url is required.
    const { downloadUrl } = await getDownloadUrl({ fileId: file.fileId });
    callTool({
      file: {
        file_id: file.fileId,
        download_url: downloadUrl,
        file_name: file.fileName,
        mime_type: file.mimeType,
      },
    });
  }

  async function resolveReturned() {
    // The tool echoed a FileRef back. Resolve its file_id to a fresh URL:
    // a download_url expires, but the file_id is durable and resolves on demand.
    const echoed = data?.structuredContent?.file;
    if (!echoed) {
      return;
    }
    const { downloadUrl } = await getDownloadUrl({ fileId: echoed.file_id });
    window.open(downloadUrl, "_blank");
  }

  return (
    <TabBody>
      <Description>
        On ChatGPT the host stores files. Upload one from the view, pick
        existing ones, resolve a download URL, or hand a file to a tool.
      </Description>

      <Input
        ref={inputRef}
        label="Upload"
        type="file"
        onChange={handleUpload}
        error={error ?? undefined}
      />

      <Button variant="secondary" className="w-fit" onClick={handleSelect}>
        Pick from library
      </Button>

      {files.length > 0 && (
        <Field label="Files">
          <div className="flex flex-col gap-2">
            {files.map((file) => (
              <div
                key={file.fileId}
                className="flex flex-wrap items-center gap-2"
              >
                <Code>{file.fileName ?? file.fileId}</Code>
                <Button variant="secondary" onClick={() => preview(file)}>
                  Preview
                </Button>
                <Button loading={isPending} onClick={() => inspect(file)}>
                  Inspect with tool
                </Button>
              </div>
            ))}
          </div>
        </Field>
      )}

      {data?.structuredContent && (
        <Field label="inspect-file result">
          <CodeBlock>
            {JSON.stringify(data.structuredContent, null, 2)}
          </CodeBlock>
          <Button
            variant="secondary"
            className="w-fit"
            onClick={resolveReturned}
          >
            Resolve returned file
          </Button>
        </Field>
      )}
    </TabBody>
  );
}
