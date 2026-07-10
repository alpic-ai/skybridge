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
import { type ReactNode, useRef, useState } from "react";
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

type ZipResult = {
  archive: ZipArchive;
  originalBytes: number;
  zippedBytes: number;
};

// A tool result only counts once it carries an archive with an id.
function toResult(
  raw:
    | { archive?: ZipArchive; originalBytes?: number; zippedBytes?: number }
    | undefined,
): ZipResult | undefined {
  if (!raw?.archive?.file_id) {
    return undefined;
  }
  return {
    archive: raw.archive,
    originalBytes: raw.originalBytes ?? 0,
    zippedBytes: raw.zippedBytes ?? 0,
  };
}

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

// Every state fills the same-size card + footer so the widget never resizes
// (it lives in an iframe the host sizes to our content).
const CARD =
  "flex min-h-32 w-full flex-col items-center justify-center gap-2 rounded-xl p-4 text-center";

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
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function FooterSlot({ children }: { children?: ReactNode }) {
  return (
    <div className="flex min-h-10 flex-wrap items-center justify-center gap-2">
      {children}
    </div>
  );
}

// Picking: a drop target that also browses / opens the library. It owns its own
// file input and drag state — selecting a file hands it back via `onFile`.
function DropTarget({
  onFile,
  onLibrary,
}: {
  onFile: (file: File) => void;
  onLibrary: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file) {
            onFile(file);
          }
        }}
        className={`${CARD} border-2 border-dashed transition-colors ${
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
      <input
        ref={inputRef}
        type="file"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onFile(file);
          }
        }}
      />
      <FooterSlot>
        <button
          type="button"
          onClick={onLibrary}
          className="inline-flex items-center gap-1.5 type-text-xs text-muted-foreground [@media(hover:hover)]:hover:text-foreground"
        >
          <FolderOpen className="size-3.5" />
          Use ChatGPT library
        </button>
      </FooterSlot>
    </>
  );
}

function Zipping() {
  return (
    <>
      <div className={`${CARD} border-2 border-dashed border-border`}>
        <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
        <p className="type-text-sm text-muted-foreground">Zipping your file…</p>
      </div>
      <FooterSlot />
    </>
  );
}

function Result({
  result,
  onDownload,
  onZipAnother,
}: {
  result: ZipResult;
  onDownload: () => void;
  onZipAnother: () => void;
}) {
  const { archive, originalBytes, zippedBytes } = result;
  const saved =
    originalBytes > 0 ? Math.round((1 - zippedBytes / originalBytes) * 100) : 0;
  return (
    <>
      <div className={`${CARD} border border-border`}>
        <CircleCheck className="size-6 text-primary" />
        <p className="type-text-sm font-medium max-w-full truncate">
          {archive.file_name}
        </p>
        <p className="type-text-xs text-muted-foreground">
          {formatBytes(originalBytes)} → {formatBytes(zippedBytes)}
          {saved > 0 && ` · ${saved}% smaller`}
        </p>
      </div>
      <FooterSlot>
        <Button
          variant="cta"
          className="w-fit"
          icon={<Download />}
          onClick={onDownload}
        >
          Download zip
        </Button>
        <Button
          variant="secondary"
          className="w-fit"
          icon={<Plus />}
          onClick={onZipAnother}
        >
          Zip another
        </Button>
      </FooterSlot>
    </>
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

  const [error, setError] = useState<string | null>(null);
  const [pickingAgain, setPickingAgain] = useState(false);
  const [working, setWorking] = useState(false);

  // Runs an action that ends in a tool call, owning the busy/error lifecycle.
  async function run(action: () => Promise<void>) {
    setError(null);
    setPickingAgain(false);
    setWorking(true);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't zip that file.");
    } finally {
      setWorking(false);
    }
  }

  async function callZip(fileId: string, fileName?: string, mimeType?: string) {
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

  // Selecting a file *is* the intent to zip, so each picker kicks off the call.
  function zipDeviceFile(picked: File) {
    void run(async () => {
      const meta = await upload(picked);
      // The host may not echo back the name/type; the picked File has them.
      await callZip(
        meta.fileId,
        meta.fileName ?? picked.name,
        meta.mimeType ?? (picked.type || undefined),
      );
    });
  }

  async function zipLibraryFile() {
    let picked: FileMetadata | undefined;
    try {
      [picked] = await selectFiles();
    } catch {
      setError("The file library isn't available on this host.");
      return;
    }
    if (picked) {
      const file = picked;
      void run(() => callZip(file.fileId, file.fileName, file.mimeType));
    }
  }

  async function download(archive: ZipArchive) {
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

  // The widget's own call wins over the host's initial result; after "zip
  // another" (pickingAgain) we ignore both until the next call lands.
  const latest =
    data?.structuredContent ?? (isHostSuccess ? output : undefined);
  const result = pickingAgain ? undefined : toResult(latest);
  const busy = working || isCalling || isHostPending;
  const status = busy ? "zipping" : result ? "done" : "picking";

  return (
    <WidgetShell theme={theme}>
      {status === "zipping" && <Zipping />}
      {status === "done" && result && (
        <Result
          result={result}
          onDownload={() => void download(result.archive)}
          onZipAnother={() => setPickingAgain(true)}
        />
      )}
      {status === "picking" && (
        <DropTarget
          onFile={zipDeviceFile}
          onLibrary={() => void zipLibraryFile()}
        />
      )}
      {error && <ErrorAlert description={error} className="max-w-md" />}
    </WidgetShell>
  );
}
