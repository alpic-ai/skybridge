import "@/index.css";

import { type ChangeEvent, useState } from "react";
import { type FileMetadata, useFiles, useOpenExternal } from "skybridge/web";
import { useCallTool } from "../helpers.js";

export default function ZipFiles() {
  const { upload, selectFiles, getDownloadUrl } = useFiles();
  const openExternal = useOpenExternal();
  const { callTool, data, isPending } = useCallTool("zip-files");

  const [file, setFile] = useState<FileMetadata>();
  const [error, setError] = useState<string | null>(null);

  // Depuis l'appareil
  const fromDevice = async (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0];
    if (picked) {
      const meta = await upload(picked);
      setFile(meta);
    }
    event.target.value = "";
  };

  // Depuis la bibliothèque ChatGPT
  const fromLibrary = async () => {
    try {
      const [picked] = await selectFiles();
      if (picked) {
        setFile(picked);
      }
    } catch {
      setError("Sélecteur de bibliothèque indisponible sur cet hôte.");
    }
  };

  // Construit le FileRef puis appelle le tool
  const createZip = async () => {
    if (!file) {
      return;
    }
    setError(null);
    const { downloadUrl } = await getDownloadUrl({ fileId: file.fileId });
    callTool({
      file: {
        file_id: file.fileId,
        download_url: downloadUrl,
        file_name: file.fileName,
        mime_type: file.mimeType,
      },
    });
  };

  const result = data?.structuredContent;

  return (
    <div className="mx-auto w-full max-w-2xl p-6 flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Zipper un fichier</h1>

      <div className="flex gap-3">
        <label className="cursor-pointer rounded-md border px-3 py-2 text-sm">
          Choisir un fichier
          <input type="file" className="hidden" onChange={fromDevice} />
        </label>
        <button
          type="button"
          onClick={fromLibrary}
          className="rounded-md border px-3 py-2 text-sm"
        >
          Bibliothèque ChatGPT
        </button>
      </div>

      {file && (
        <p className="rounded-md border px-3 py-2 text-sm">
          {file.fileName ?? file.fileId}
        </p>
      )}

      <button
        type="button"
        onClick={createZip}
        disabled={!file || isPending}
        className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {isPending ? "Création du zip…" : "Créer le zip"}
      </button>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {result && (
        <div className="rounded-md border p-4 flex flex-col gap-2">
          <p className="font-medium">{result.archive.file_name}</p>
          <p className="text-sm text-gray-500">
            {result.originalBytes} → {result.zippedBytes} octets
          </p>
          <button
            type="button"
            onClick={() => openExternal(result.archive.download_url)}
            className="self-start rounded-md bg-green-600 px-4 py-2 text-white"
          >
            Télécharger le zip
          </button>
        </div>
      )}
    </div>
  );
}