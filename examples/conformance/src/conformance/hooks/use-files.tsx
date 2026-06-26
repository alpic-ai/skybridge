import { Button } from "@alpic-ai/ui/components/button";
import { type ChangeEvent, useState } from "react";
import { useFiles } from "skybridge/web";
import { Description, Stack } from "@/views/components/ui.js";
import {
  errMessage,
  useManualRun,
  useMemberReport,
  useRuntime,
} from "../context.js";
import type { HookDef } from "../types.js";

function UploadFile() {
  const runtime = useRuntime();
  const report = useMemberReport();
  const { upload } = useFiles();
  const [busy, setBusy] = useState(false);

  async function handler(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    setBusy(true);
    try {
      const meta = await upload(file);
      report(
        runtime === "mcp-app"
          ? {
              support: "error",
              detail: `resolved on MCP Apps (fileId=${meta.fileId})`,
            }
          : {
              support: "supported",
              detail: `uploaded "${file.name}" -> ${meta.fileId}`,
            },
      );
    } catch (err) {
      report(
        runtime === "mcp-app"
          ? {
              support: "unsupported",
              detail: "useFiles throws on MCP Apps as documented",
            }
          : { support: "error", detail: errMessage(err) },
      );
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  return (
    <Stack>
      <Description>
        Pick a file to upload to the host. On Apps SDK the upload should resolve
        with file metadata; on MCP Apps it should throw.
      </Description>
      <input
        type="file"
        disabled={busy}
        onChange={handler}
        className="block w-full type-text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:font-medium file:text-foreground"
      />
    </Stack>
  );
}

function SelectFiles() {
  const runtime = useRuntime();
  const { selectFiles } = useFiles();
  const { run, busy } = useManualRun(async () => {
    if (typeof selectFiles !== "function") {
      return {
        support: "unsupported" as const,
        detail: "selectFiles not exposed by this host",
      };
    }
    try {
      const picked = await selectFiles();
      return runtime === "mcp-app"
        ? { support: "error" as const, detail: "resolved on MCP Apps" }
        : {
            support: "supported" as const,
            detail: `picked ${picked.length} file(s)`,
          };
    } catch (e) {
      return runtime === "mcp-app"
        ? {
            support: "unsupported" as const,
            detail: "throws on MCP Apps as documented",
          }
        : { support: "error" as const, detail: errMessage(e) };
    }
  });
  return (
    <Button loading={busy} onClick={run}>
      Open file picker
    </Button>
  );
}

export const useFilesHook: HookDef = {
  name: "useFiles",
  source: "skybridge/web",
  docPath: "use-files",
  summary: "Upload and pick host-managed files (Apps SDK only).",
  members: [
    {
      id: "useFiles.upload",
      name: "upload",
      description:
        "Upload a File via the host file input. Resolves with FileMetadata on Apps SDK; throws on MCP Apps.",
      kind: "manual",
      Test: UploadFile,
    },
    {
      id: "useFiles.selectFiles",
      name: "selectFiles",
      description:
        "Open the host's native file picker. Resolves on Apps SDK; throws on MCP Apps and may be unexposed by the host.",
      kind: "manual",
      Test: SelectFiles,
    },
  ],
};
