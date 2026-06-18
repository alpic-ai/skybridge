import { Button } from "@alpic-ai/ui/components/button";
import { Input } from "@alpic-ai/ui/components/input";
import { useRef, useState } from "react";
import { useFiles } from "skybridge/web";
import { Code, Description, Field, TabBody } from "../components/ui.js";

export function UseFilesTab() {
  const { upload, getDownloadUrl } = useFiles();
  const [fileId, setFileId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setIsUploading(true);
    setError(null);
    try {
      const { fileId } = await upload(file);
      setFileId(fileId);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDownload() {
    if (!fileId) {
      return;
    }
    try {
      const { downloadUrl } = await getDownloadUrl({ fileId });
      window.open(downloadUrl, "_blank");
    } catch (error) {
      console.error("Download failed:", error);
    }
  }

  function handleClear() {
    setFileId(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <TabBody>
      <Description>
        Upload and download files via the host application.
      </Description>

      <Input
        ref={inputRef}
        label="Upload"
        type="file"
        onChange={handleUpload}
        disabled={isUploading}
        error={error ?? undefined}
      />

      {fileId && (
        <Field label="File ID">
          <Code>{fileId}</Code>
        </Field>
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleDownload} disabled={!fileId}>
          Download
        </Button>
        <Button variant="secondary" onClick={handleClear} disabled={!fileId}>
          Clear
        </Button>
      </div>
    </TabBody>
  );
}
