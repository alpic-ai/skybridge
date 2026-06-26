import { Button } from "@alpic-ai/ui/components/button";
import { useEffect } from "react";
import { useRequestModal } from "skybridge/web";
import { Code } from "@/views/components/ui.js";
import { useConformance, useManualRun } from "../context.js";
import type { HookDef } from "../types.js";

const OPEN_ID = "useRequestModal.open";

/**
 * Rendered at the view root (see `conformance.tsx`) when the host puts the view
 * in modal mode. The host owns dismissal: MCP Apps closes via the backdrop /
 * Escape (the framework's ModalProvider), Apps SDK via its modal chrome — so
 * there is intentionally NO in-view close button here (requestClose would tear
 * down the whole view, not just the modal).
 */
export function ModalContent({ params }: { params?: Record<string, unknown> }) {
  const { report } = useConformance();

  useEffect(() => {
    report(OPEN_ID, {
      support: "supported",
      detail: `view rendered in modal mode; params=${JSON.stringify(params ?? {})}`,
    });
  }, [report, params]);

  return (
    <div className="flex min-h-dvh flex-col items-start gap-4 p-6">
      <h2 className="type-display-xs font-semibold text-foreground">
        Modal mode
      </h2>
      <p className="type-text-sm text-muted-foreground">
        useRequestModal opened this view as a modal. Params received:
      </p>
      <Code>{JSON.stringify(params ?? {})}</Code>
      <p className="type-text-sm text-muted-foreground">
        Close it from the host (click the backdrop or press Escape on MCP Apps,
        or use the host's close control) to return to the results.
      </p>
    </div>
  );
}

function OpenMember() {
  const { open } = useRequestModal();
  const { run, busy } = useManualRun(() => {
    // open() resolves the request; the host then renders the view in modal mode
    // (a no-op throw would surface as "error" via useManualRun). useRequestModal
    // is supported on both runtimes (native on Apps SDK, polyfilled on MCP Apps).
    open({
      title: "Conformance modal",
      params: { marker: "modal-params-roundtrip" },
    });
    return {
      support: "supported" as const,
      detail: "modal requested — the host should render the view as a modal",
    };
  });
  return (
    <Button variant="secondary" loading={busy} onClick={run}>
      Open as modal
    </Button>
  );
}

export const useRequestModalHook: HookDef = {
  name: "useRequestModal",
  source: "skybridge/web",
  docPath: "use-request-modal",
  summary: "Open the view as a host-portaled modal.",
  members: [
    {
      id: OPEN_ID,
      name: "open",
      description:
        "Requesting modal mode re-renders the view as a modal and round-trips params.",
      kind: "manual",
      Test: OpenMember,
    },
  ],
};
