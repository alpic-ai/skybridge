import "@/index.css";

import { ErrorAlert } from "@alpic-ai/ui/components/alert";
import { Button } from "@alpic-ai/ui/components/button";
import {
  CircleCheck,
  Download,
  FolderOpen,
  LoaderCircle,
  Plus,
  Upload,
} from "lucide-react";
import {
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
  useRef,
  useState,
} from "react";
import {
  type FileMetadata,
  useFiles,
  useLayout,
  useOpenExternal,
} from "skybridge/web";
import { useCallTool, useToolInfo } from "../helpers.js";

type ZipArchive = {
  file_id: string;
  download_url?: string;
  file_name?: string;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}

function WidgetShell({
  theme,
  children,
}: {
  theme: string | undefined;
  children: ReactNode;
}) {
  return (
    <div
      className={`${theme === "dark" ? "dark" : ""} bg-background text-foreground p-4`}
    >
      {children}
    </div>
  );
}

export default function ZipFile() {
  const { theme } = useLayout();
  const { upload, selectFiles, getDownloadUrl } = useFiles();
  const openExternal = useOpenExternal();
  const {
    output,
    isPending: isHostPending,
    isSuccess: isHostSuccess,
  } = useToolInfo<"zip-file">();
  const { callTool, data, isPending: isCalling } = useCallTool("zip-file");
  const inputRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [working, setWorking] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Selecting a file *is* the intent to zip, so kick off the tool call right
  // away — no separate "create" step. `run` owns the busy/error lifecycle.
  async function run(task: () => Promise<void>) {
    setError(null);
    setShowPicker(false);
    setWorking(true);
    try {
      await task();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't zip that file.");
    } finally {
      setWorking(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  async function submit(fileId: string, fileName?: string, mimeType?: string) {
    const { downloadUrl } = await getDownloadUrl({ fileId });
    callTool({
      file: {
        file_id: fileId,
        download_url: downloadUrl,
        file_name: fileName,
        mime_type: mimeType,
      },
    });
  }

  function handleFile(picked: File) {
    void run(async () => {
      const meta = await upload(picked);
      // The host may not echo back the name/type; the picked File has them.
      await submit(
        meta.fileId,
        meta.fileName ?? picked.name,
        meta.mimeType ?? (picked.type || undefined),
      );
    });
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    if (picked) {
      handleFile(picked);
    }
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setIsDragging(false);
    const picked = event.dataTransfer.files?.[0];
    if (picked) {
      handleFile(picked);
    }
  }

  async function handleLibrary() {
    let picked: FileMetadata | undefined;
    try {
      [picked] = await selectFiles();
    } catch {
      setError("The file library isn't available on this host.");
      return;
    }
    if (picked) {
      const file = picked;
      void run(() => submit(file.fileId, file.fileName, file.mimeType));
    }
  }

  function handleZipAnother() {
    setShowPicker(true);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  async function handleDownload(archive: ZipArchive) {
    try {
      const { downloadUrl } = await getDownloadUrl({ fileId: archive.file_id });
      openExternal(downloadUrl);
      return;
    } catch {
      // Host may not know this file_id yet (e.g. direct R2 presigned URL).
    }
    if (archive.download_url) {
      openExternal(archive.download_url);
      return;
    }
    setError("Unable to get the download URL.");
  }

  const busy = working || isCalling || isHostPending;
  // Prefer this widget's own result over the host's. `showPicker` (set by "zip
  // another") hides the prior result until the next call lands.
  const latest =
    data?.structuredContent ?? (isHostSuccess ? output : undefined);
  const archive =
    !showPicker && latest?.archive?.file_id ? latest.archive : undefined;

  // Every state fills the same-size card + footer so the widget never resizes
  // (it lives in an iframe the host sizes to our content).
  const cardBase =
    "flex min-h-32 w-full flex-col items-center justify-center gap-2 rounded-xl p-4 text-center";

  let card: ReactNode;
  let footer: ReactNode = null;

  if (busy) {
    card = (
      <div className={`${cardBase} border-2 border-dashed border-border`}>
        <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
        <p className="type-text-sm text-muted-foreground">Zipping your file…</p>
      </div>
    );
  } else if (archive) {
    const originalBytes = latest?.originalBytes ?? 0;
    const zippedBytes = latest?.zippedBytes ?? 0;
    const saved =
      originalBytes > 0
        ? Math.round((1 - zippedBytes / originalBytes) * 100)
        : 0;
    card = (
      <div className={`${cardBase} border border-border`}>
        <CircleCheck className="size-6 text-primary" />
        <p className="type-text-sm font-medium max-w-full truncate">
          {archive.file_name}
        </p>
        <p className="type-text-xs text-muted-foreground">
          {formatBytes(originalBytes)} → {formatBytes(zippedBytes)}
          {saved > 0 && ` · ${saved}% smaller`}
        </p>
      </div>
    );
    footer = (
      <>
        <Button
          variant="cta"
          className="w-fit"
          icon={<Download />}
          onClick={() => void handleDownload(archive)}
        >
          Download zip
        </Button>
        <Button
          variant="secondary"
          className="w-fit"
          icon={<Plus />}
          onClick={handleZipAnother}
        >
          Zip another
        </Button>
      </>
    );
  } else {
    card = (
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`${cardBase} border-2 border-dashed transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border [@media(hover:hover)]:hover:border-muted-foreground/40 [@media(hover:hover)]:hover:bg-muted/40"
        }`}
      >
        <Upload className="size-6 text-muted-foreground" />
        <span className="type-text-sm font-medium">Drop a file to zip it</span>
        <span className="type-text-xs text-muted-foreground">
          or click to browse
        </span>
      </button>
    );
    footer = (
      <button
        type="button"
        onClick={handleLibrary}
        className="inline-flex items-center gap-1.5 type-text-xs text-muted-foreground [@media(hover:hover)]:hover:text-foreground"
      >
        <FolderOpen className="size-3.5" />
        Use ChatGPT library
      </button>
    );
  }

  return (
    <WidgetShell theme={theme}>
      <div className="flex flex-col gap-3">
        {card}
        <div className="flex min-h-10 flex-wrap items-center justify-center gap-2">
          {footer}
        </div>
        <input ref={inputRef} type="file" hidden onChange={handleInput} />
        {error && <ErrorAlert description={error} className="max-w-md" />}
      </div>
    </WidgetShell>
  );
}
