import { useRef, useState } from "react";
import { useFiles } from "skybridge/web";

export function UseFilesTab() {
  const { upload, download } = useFiles();
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
      const { downloadUrl } = await download({ fileId });
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
    <div className="tab-content">
      <p className="description">
        Upload and download files via the host application.
      </p>

      <div className="field">
        <span className="field-label">Upload</span>
        <input
          ref={inputRef}
          type="file"
          onChange={handleUpload}
          disabled={isUploading}
        />
      </div>

      {error && <p className="error">{error}</p>}

      {fileId && (
        <div className="field">
          <span className="field-label">File ID</span>
          <code>{fileId}</code>
        </div>
      )}

      <div className="button-row">
        <button
          type="button"
          className="btn"
          onClick={handleDownload}
          disabled={!fileId}
        >
          Download
        </button>
        <button
          type="button"
          className="btn btn-outline"
          onClick={handleClear}
          disabled={!fileId}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
