import { useRef, useState } from "react";
import type { FileMetadata } from "skybridge/web";
import { useFiles } from "skybridge/web";

export function UseFilesTab() {
  const { upload, getDownloadUrl, selectFiles } = useFiles();
  const [fileId, setFileId] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileMetadata[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [saveToLibrary, setSaveToLibrary] = useState(false);
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
      const options = saveToLibrary ? { library: true as const } : undefined;
      const { fileId } = await upload(file, options);
      setFileId(fileId);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSelectFiles() {
    setError(null);
    try {
      const files = await selectFiles();
      setSelectedFiles(files);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "File selection failed",
      );
    }
  }

  async function handleDownload(id: string) {
    try {
      const { downloadUrl } = await getDownloadUrl({ fileId: id });
      window.open(downloadUrl, "_blank");
    } catch (error) {
      console.error("Download failed:", error);
    }
  }

  function handleClear() {
    setFileId(null);
    setSelectedFiles([]);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <div className="tab-content">
      <p className="description">
        Upload, select, and download files via the host application.
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

      <div className="field">
        <label>
          <input
            type="checkbox"
            checked={saveToLibrary}
            onChange={(e) => setSaveToLibrary(e.target.checked)}
          />{" "}
          Save to ChatGPT file library
        </label>
      </div>

      {error && <p className="error">{error}</p>}

      {fileId && (
        <div className="field">
          <span className="field-label">Uploaded File ID</span>
          <code>{fileId}</code>
        </div>
      )}

      <div className="button-row">
        <button
          type="button"
          className="btn"
          onClick={() => fileId && handleDownload(fileId)}
          disabled={!fileId}
        >
          Download Uploaded
        </button>
        <button
          type="button"
          className="btn"
          onClick={handleSelectFiles}
        >
          Select Files
        </button>
        <button
          type="button"
          className="btn btn-outline"
          onClick={handleClear}
          disabled={!fileId && selectedFiles.length === 0}
        >
          Clear
        </button>
      </div>

      {selectedFiles.length > 0 && (
        <div className="field">
          <span className="field-label">Selected Files</span>
          <ul>
            {selectedFiles.map((file) => (
              <li key={file.fileId}>
                <code>{file.fileName ?? file.fileId}</code>
                {file.mimeType && (
                  <span style={{ opacity: 0.6 }}> ({file.mimeType})</span>
                )}
                <button
                  type="button"
                  className="btn"
                  style={{ marginLeft: 8 }}
                  onClick={() => handleDownload(file.fileId)}
                >
                  Download
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
