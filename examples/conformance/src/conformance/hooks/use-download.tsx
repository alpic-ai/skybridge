import { Button } from "@alpic-ai/ui/components/button";
import { useDownload } from "skybridge/web";
import { errMessage, useManualRun, useRuntime } from "../context.js";
import type { HookDef, MemberResult, Runtime } from "../types.js";

/** Classify a download result by the runtime contract. */
function classify(
  runtime: Runtime,
  isError: boolean | undefined,
): MemberResult {
  if (runtime === "apps-sdk") {
    return isError
      ? {
          support: "unsupported",
          detail: "Apps SDK returns isError (not supported)",
        }
      : {
          support: "error",
          detail: "unexpectedly succeeded on Apps SDK",
        };
  }
  return isError
    ? { support: "error", detail: "download returned isError on MCP Apps" }
    : { support: "supported", detail: "host accepted the download" };
}

function DownloadText() {
  const runtime = useRuntime();
  const { download } = useDownload();
  const { run, busy } = useManualRun(async () => {
    try {
      const { isError } = await download({
        contents: [
          {
            type: "resource",
            resource: {
              uri: "file:///conformance/report.md",
              mimeType: "text/markdown",
              text: "# hello",
            },
          },
        ],
      });
      return classify(runtime, isError);
    } catch (e) {
      return { support: "error" as const, detail: errMessage(e) };
    }
  });
  return (
    <Button loading={busy} onClick={run}>
      Download text resource
    </Button>
  );
}

function DownloadBlob() {
  const runtime = useRuntime();
  const { download } = useDownload();
  const { run, busy } = useManualRun(async () => {
    try {
      const { isError } = await download({
        contents: [
          {
            type: "resource",
            resource: {
              uri: "file:///conformance/pixel.png",
              mimeType: "image/png",
              blob: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC",
            },
          },
        ],
      });
      return classify(runtime, isError);
    } catch (e) {
      return { support: "error" as const, detail: errMessage(e) };
    }
  });
  return (
    <Button loading={busy} onClick={run}>
      Download png blob
    </Button>
  );
}

function DownloadResourceLink() {
  const runtime = useRuntime();
  const { download } = useDownload();
  const { run, busy } = useManualRun(async () => {
    try {
      const { isError } = await download({
        contents: [
          {
            type: "resource_link",
            uri: "https://raw.githubusercontent.com/alpic-ai/skybridge/main/README.md",
            name: "skybridge-readme",
          },
        ],
      });
      if (runtime === "apps-sdk") {
        return classify(runtime, isError);
      }
      return isError
        ? {
            support: "unsupported" as const,
            detail: "resource_link downloads may be unsupported by this host",
          }
        : {
            support: "supported" as const,
            detail: "host accepted the download",
          };
    } catch (e) {
      return { support: "error" as const, detail: errMessage(e) };
    }
  });
  return (
    <Button loading={busy} onClick={run}>
      Download resource_link
    </Button>
  );
}

export const useDownloadHook: HookDef = {
  name: "useDownload",
  source: "skybridge/web",
  docPath: "use-download",
  summary: "Save files to the user's device (MCP Apps only).",
  members: [
    {
      id: "useDownload.text",
      name: "download(text resource)",
      description:
        "Offer an inline text/markdown EmbeddedResource for download. MCP Apps performs it; Apps SDK returns isError (unsupported).",
      kind: "manual",
      Test: DownloadText,
    },
    {
      id: "useDownload.blob",
      name: "download(png blob)",
      description:
        "Offer an inline base64 image/png EmbeddedResource (blob) for download. MCP Apps performs it; Apps SDK returns isError (unsupported).",
      kind: "manual",
      Test: DownloadBlob,
    },
    {
      id: "useDownload.resourceLink",
      name: "download(resource_link)",
      description:
        "Offer a ResourceLink (remote URL) for download. Apps SDK returns isError (unsupported); some MCP hosts may not support resource_link downloads.",
      kind: "manual",
      Test: DownloadResourceLink,
    },
  ],
};
