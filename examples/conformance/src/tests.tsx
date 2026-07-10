import { type ComponentType, useEffect, useRef } from "react";
import {
  getAdaptor,
  useCallTool,
  useDisplayMode,
  useDownload,
  useFiles,
  useLayout,
  useOpenExternal,
  useRegisterViewTool,
  useRequestClose,
  useRequestModal,
  useRequestSize,
  useSendFollowUpMessage,
  useSetOpenInAppUrl,
  useToolInfo,
  useUser,
  useViewState,
} from "skybridge/web";
import { z } from "zod";

/**
 * One conformance test per Skybridge web hook (docs.skybridge.tech
 * /api-reference/overview#hooks). `useRequestClose` runs last: a granted close
 * dismisses the view and ends the run, so only its failure modes are recorded.
 *
 * Verdicts are outcome-driven:
 * - `supported`   — the hook did its job on this host.
 * - `partial`     — part of the hook works; the detail says which part
 *                   doesn't (e.g. structuredContent arrives but _meta does
 *                   not).
 * - `unsupported` — the host lacks the capability: Skybridge degraded
 *                   gracefully (documented no-op / throw / isError) or the
 *                   call ran without any observable effect.
 * - `error`       — an unexpected failure (a real problem to investigate).
 *
 * Each test is a component that mounts, drives the hook once, and reports via
 * `onResult`. `auto` tests mount as soon as their step is reached; the others
 * wait for the user to press Run. Tests whose side effect can't be verified
 * programmatically set `confirm`: after a successful run the user is asked
 * whether the effect actually happened.
 */
export type Verdict = "supported" | "partial" | "unsupported" | "error";
export type TestResult = {
  verdict: Verdict;
  detail: string;
  /** Set false when a `confirm` test verified the effect programmatically. */
  needsConfirm?: boolean;
};
export type TestProps = { onResult: (result: TestResult) => void };
export type TestDef = {
  /** Hook under test, e.g. `useCallTool`. */
  hook: string;
  /** Short label for what the test does. */
  name: string;
  /** One-line explanation shown in the stepper. */
  description: string;
  /** Mounts as soon as the step is reached (no user-visible side effect). */
  auto?: boolean;
  /** Question asked after a successful run when only the user can verify it. */
  confirm?: string;
  /** Label for the action button (defaults to "Run"). */
  runLabel?: string;
  /** Runner safety-net timeout for auto tests (defaults to 15s). */
  timeoutMs?: number;
  Test: ComponentType<TestProps>;
};

const OUTPUT_MARKER = "structured-content-visible-to-model-and-view";
const META_SECRET = "meta-is-view-only";
const VIEW_TOOL = "conformance_view_echo";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const errMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));
const supported = (detail: string): TestResult => ({
  verdict: "supported",
  detail,
});
const partial = (detail: string): TestResult => ({
  verdict: "partial",
  detail,
});
const unsupported = (detail: string): TestResult => ({
  verdict: "unsupported",
  detail,
});
const failed = (detail: string): TestResult => ({ verdict: "error", detail });

export function detectRuntime(): "apps-sdk" | "mcp-app" | "unknown" {
  const hostType = window.skybridge?.hostType;
  return hostType === "apps-sdk" || hostType === "mcp-app"
    ? hostType
    : "unknown";
}

/**
 * Run an async probe exactly once on mount (StrictMode-safe) and report its
 * outcome. An uncaught throw reports `error`; tests catch the throws that mean
 * "documented degradation" themselves and map them to `unsupported`.
 */
function useProbe(
  onResult: (result: TestResult) => void,
  fn: () => Promise<TestResult>,
) {
  const ran = useRef(false);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const reportRef = useRef(onResult);
  reportRef.current = onResult;
  useEffect(() => {
    if (ran.current) {
      return;
    }
    ran.current = true;
    fnRef.current().then(
      (result) => reportRef.current(result),
      (e) => reportRef.current(failed(errMessage(e))),
    );
  }, []);
}

function ToolInfoTest({ onResult }: TestProps) {
  const { input, output, responseMetadata } = useToolInfo<{
    output: { marker?: string };
    responseMetadata: { secret?: string };
  }>();
  // Hosts may deliver the tool result after mount; poll the latest render.
  const latest = useRef({ input, output, responseMetadata });
  latest.current = { input, output, responseMetadata };

  useProbe(onResult, async () => {
    // The tool result reaches the view asynchronously (bridge handshake, then
    // a host push that competes with the still-streaming assistant turn), so
    // wait generously instead of racing it, and report the observed latency.
    const start = Date.now();
    const deadline = start + 30_000;
    while (Date.now() < deadline) {
      const current = latest.current;
      if (
        current.output?.marker === OUTPUT_MARKER &&
        current.responseMetadata?.secret === META_SECRET
      ) {
        const seconds = ((Date.now() - start) / 1000).toFixed(1);
        return supported(
          `structuredContent and result _meta delivered after ${seconds}s · input ${
            current.input ? JSON.stringify(current.input) : "not delivered"
          }`,
        );
      }
      await sleep(200);
    }
    const { output: out, responseMetadata: meta } = latest.current;
    if (!out) {
      return unsupported(
        "the tool's structuredContent was not delivered to the view within 30s",
      );
    }
    if (out.marker !== OUTPUT_MARKER) {
      return failed(`unexpected structuredContent: ${JSON.stringify(out)}`);
    }
    return partial(
      `structuredContent arrived but the result _meta did not (responseMetadata: ${JSON.stringify(meta)})`,
    );
  });
  return null;
}

function LayoutTest({ onResult }: TestProps) {
  const { theme, maxHeight, safeArea } = useLayout();
  useProbe(onResult, async () => {
    const { top, right, bottom, left } = safeArea.insets;
    const detail = `theme "${theme}" · maxHeight ${maxHeight ?? "unset"} · insets ${top}/${right}/${bottom}/${left}`;
    const themeOk = theme === "light" || theme === "dark";
    const insetsOk = [top, right, bottom, left].every(
      (n) => typeof n === "number",
    );
    if (themeOk && insetsOk) {
      return supported(detail);
    }
    if (themeOk || insetsOk) {
      return partial(
        `${themeOk ? "safeArea insets are not numeric" : "theme is not light/dark"} · ${detail}`,
      );
    }
    return failed(detail);
  });
  return null;
}

function UserTest({ onResult }: TestProps) {
  const { locale, userAgent } = useUser();
  useProbe(onResult, async () => {
    const { hover, touch } = userAgent.capabilities;
    const detail = `locale "${locale}" · device "${userAgent.device.type}" · hover ${hover} · touch ${touch}`;
    const problems: string[] = [];
    try {
      new Intl.Locale(locale);
    } catch {
      problems.push(`locale "${locale}" does not parse via Intl.Locale`);
    }
    if (
      !["mobile", "tablet", "desktop", "unknown"].includes(
        userAgent.device.type,
      )
    ) {
      problems.push(`unknown device type "${userAgent.device.type}"`);
    }
    if (typeof hover !== "boolean" || typeof touch !== "boolean") {
      problems.push("capabilities are not booleans");
    }
    if (problems.length === 0) {
      return supported(detail);
    }
    const problemDetail = `${problems.join(" · ")} · ${detail}`;
    return problems.length < 3 ? partial(problemDetail) : failed(problemDetail);
  });
  return null;
}

function ViewStateTest({ onResult }: TestProps) {
  const [state, setState] = useViewState<{ probe?: number }>({ probe: 0 });
  const stateRef = useRef(state);
  stateRef.current = state;
  useProbe(onResult, async () => {
    const target = (stateRef.current?.probe ?? 0) + 1;
    setState((prev) => ({ ...prev, probe: target }));
    await sleep(150);
    // Note: this observes the hook's state, which Skybridge keeps even when the
    // host write fails — host-side persistence isn't programmatically checkable.
    return stateRef.current?.probe === target
      ? supported(`setViewState wrote probe=${target} and read it back`)
      : failed(
          `wrote probe=${target} but read back ${JSON.stringify(stateRef.current)}`,
        );
  });
  return null;
}

function CallToolTest({ onResult }: TestProps) {
  const { callToolAsync } = useCallTool<{ label?: string }>("conformance");
  useProbe(onResult, async () => {
    try {
      const res = await callToolAsync({ label: "call-tool-probe" });
      const echoed = (res.structuredContent as { label?: string } | undefined)
        ?.label;
      return echoed === "call-tool-probe"
        ? supported("the conformance tool round-tripped structuredContent")
        : failed(
            `unexpected structuredContent: ${JSON.stringify(res.structuredContent)}`,
          );
    } catch (e) {
      return unsupported(`tool call failed: ${errMessage(e)}`);
    }
  });
  return null;
}

function SetOpenInAppUrlTest({ onResult }: TestProps) {
  const setOpenInAppUrl = useSetOpenInAppUrl();
  useProbe(onResult, async () => {
    try {
      await setOpenInAppUrl("https://docs.skybridge.tech");
      return supported("host accepted the open-in-app URL (no visible effect)");
    } catch (e) {
      return unsupported(`throws on this host: ${errMessage(e)}`);
    }
  });
  return null;
}

function DisplayModeTest({ onResult }: TestProps) {
  const [mode, setMode] = useDisplayMode();
  const initial = useRef(mode);
  useProbe(onResult, async () => {
    try {
      const granted = (await setMode("fullscreen")).mode;
      if (granted !== "fullscreen") {
        return partial(
          `mode reads "${initial.current}" but the host granted "${granted}" instead of fullscreen`,
        );
      }
      return supported(
        `read "${initial.current}" · fullscreen granted (switch back manually)`,
      );
    } catch (e) {
      return unsupported(`setDisplayMode failed: ${errMessage(e)}`);
    }
  });
  return null;
}

function RequestSizeTest({ onResult }: TestProps) {
  const requestSize = useRequestSize();
  useProbe(onResult, async () => {
    const before = window.innerHeight;
    // Shrink rather than grow — growth can be silently capped by maxHeight.
    const target = Math.max(before - 120, 160);
    try {
      await requestSize({ height: target });
      await sleep(900);
      const after = window.innerHeight;
      await requestSize({ height: before });
      return Math.abs(after - before) > 20
        ? supported(`iframe height ${before}px → ${after}px`)
        : unsupported(
            `no height change after requesting ${target}px (stayed at ${after}px)`,
          );
    } catch (e) {
      return unsupported(`request failed: ${errMessage(e)}`);
    }
  });
  return null;
}

function RequestModalTest({ onResult }: TestProps) {
  const { open } = useRequestModal();
  useProbe(onResult, async () => {
    try {
      open({ title: "Skybridge conformance", params: { probe: "modal" } });
    } catch (e) {
      return unsupported(`open() failed: ${errMessage(e)}`);
    }
    // When the host re-renders THIS view instance in modal mode the runner
    // unmounts (the modal content replaces the tree at the root), so watch the
    // display mode through the adaptor store, which outlives the unmount.
    const deadline = Date.now() + 4000;
    while (Date.now() < deadline) {
      const { mode } = getAdaptor()
        .getHostContextStore("display")
        .getSnapshot();
      if (mode === "modal") {
        return {
          ...supported("the view re-rendered in modal mode"),
          needsConfirm: false,
        };
      }
      await sleep(150);
    }
    // No in-view flip: the host may have opened a separate modal instance
    // (Apps SDK); only the user can tell.
    return supported("modal requested");
  });
  return null;
}

function OpenExternalTest({ onResult }: TestProps) {
  const openExternal = useOpenExternal();
  useProbe(onResult, async () => {
    openExternal("https://docs.skybridge.tech");
    return supported("open request dispatched");
  });
  return null;
}

function DownloadTest({ onResult }: TestProps) {
  const { download } = useDownload();
  useProbe(onResult, async () => {
    try {
      const { isError } = await download({
        contents: [
          {
            type: "resource",
            resource: {
              uri: "file:///skybridge-conformance.md",
              mimeType: "text/markdown",
              text: "# Skybridge conformance\n\nIf this file is on your device, useDownload works.",
            },
          },
        ],
      });
      return isError
        ? unsupported("host reported isError for the download request")
        : supported("download request accepted");
    } catch (e) {
      return unsupported(`download failed: ${errMessage(e)}`);
    }
  });
  return null;
}

function FilesTest({ onResult }: TestProps) {
  const { upload } = useFiles();
  useProbe(onResult, async () => {
    try {
      const meta = await upload(
        new File(
          ["Skybridge conformance upload probe."],
          "skybridge-conformance.txt",
          { type: "text/plain" },
        ),
      );
      return supported(`uploaded a text file → fileId ${meta.fileId}`);
    } catch (e) {
      return unsupported(`upload throws on this host: ${errMessage(e)}`);
    }
  });
  return null;
}

function SendFollowUpTest({ onResult }: TestProps) {
  const send = useSendFollowUpMessage();
  useProbe(onResult, async () => {
    try {
      await send(
        "Skybridge conformance test: please reply with a short acknowledgement.",
      );
      return supported("follow-up dispatched");
    } catch (e) {
      return unsupported(`send failed: ${errMessage(e)}`);
    }
  });
  return null;
}

function RegisterViewToolTest({ onResult }: TestProps) {
  const send = useSendFollowUpMessage();
  const invokedRef = useRef<((message: string) => void) | null>(null);

  useRegisterViewTool(
    {
      name: VIEW_TOOL,
      description: "Echo a message back from the conformance view.",
      inputSchema: { message: z.string() },
    },
    ({ message }) => {
      invokedRef.current?.(message);
      return {
        content: [{ type: "text", text: `view echoed: ${message}` }],
        structuredContent: { message },
        isError: false,
      };
    },
  );

  useProbe(onResult, async () => {
    if (detectRuntime() === "apps-sdk") {
      return unsupported("view-tool registration is a no-op on Apps SDK");
    }
    const invocation = new Promise<string | null>((resolve) => {
      invokedRef.current = resolve;
      setTimeout(() => resolve(null), 60_000);
    });
    try {
      await send(
        `Please call the "${VIEW_TOOL}" tool with the message "ping".`,
      );
    } catch (e) {
      return unsupported(
        `could not send the follow-up that triggers the call: ${errMessage(e)}`,
      );
    }
    const message = await invocation;
    return message === null
      ? unsupported(
          "the view tool registered without error but the host did not invoke it within 60s",
        )
      : supported(`host invoked ${VIEW_TOOL} with message "${message}"`);
  });
  return null;
}

function RequestCloseTest({ onResult }: TestProps) {
  const requestClose = useRequestClose();
  useProbe(onResult, async () => {
    try {
      await requestClose();
    } catch (e) {
      return unsupported(`requestClose throws on this host: ${errMessage(e)}`);
    }
    // A granted close dismisses the view before this line matters; if we are
    // still here after a beat, the host kept the view around.
    await sleep(2000);
    return unsupported("requestClose resolved but the view was not dismissed");
  });
  return null;
}

/** Every hook test, in run order: silent reads first, disruptive actions last. */
export const TESTS: TestDef[] = [
  {
    hook: "useToolInfo",
    name: "tool output & _meta delivery",
    description:
      "The rendering tool's structuredContent and result _meta reach the view (waits up to 30s for delivery).",
    auto: true,
    timeoutMs: 35_000,
    Test: ToolInfoTest,
  },
  {
    hook: "useLayout",
    name: "theme, maxHeight, safeArea",
    description: "The host reports a valid theme and numeric safe-area insets.",
    auto: true,
    Test: LayoutTest,
  },
  {
    hook: "useUser",
    name: "locale & device capabilities",
    description:
      "The host reports a parseable locale, a known device type, and boolean capabilities.",
    auto: true,
    Test: UserTest,
  },
  {
    hook: "useViewState",
    name: "write → read round-trip",
    description: "setViewState writes a value that reads back from the hook.",
    auto: true,
    Test: ViewStateTest,
  },
  {
    hook: "useCallTool",
    name: "tool call round-trip",
    description:
      "The view calls the conformance tool and reads its structuredContent.",
    auto: true,
    Test: CallToolTest,
  },
  {
    hook: "useSetOpenInAppUrl",
    name: "set the open-in-app URL",
    description:
      "Sets the fullscreen open-in-app URL; hosts that lack it throw.",
    auto: true,
    Test: SetOpenInAppUrlTest,
  },
  {
    hook: "useDisplayMode",
    name: "fullscreen request",
    description:
      "Requests fullscreen and checks the granted mode. Restore the initial mode yourself via the host controls.",
    Test: DisplayModeTest,
  },
  {
    hook: "useRequestSize",
    name: "resize the view iframe",
    description:
      "Requests a smaller height and checks the iframe actually resized.",
    Test: RequestSizeTest,
  },
  {
    hook: "useRequestModal",
    name: "open the view as a modal",
    description: "Asks the host to render this view in modal mode.",
    confirm:
      "Did the view open as a modal? Close it (its Close button, Escape, or the host's close control) before answering.",
    Test: RequestModalTest,
  },
  {
    hook: "useOpenExternal",
    name: "open an external link",
    description: "Asks the host to open docs.skybridge.tech outside the view.",
    confirm:
      "Did docs.skybridge.tech open outside the app (browser or new tab)?",
    Test: OpenExternalTest,
  },
  {
    hook: "useDownload",
    name: "download a markdown file",
    description: "Offers skybridge-conformance.md for download.",
    confirm: 'Did "skybridge-conformance.md" download to your device?',
    Test: DownloadTest,
  },
  {
    hook: "useFiles",
    name: "upload a file to the host",
    description:
      "Uploads a small generated text file; hosts that lack it throw.",
    Test: FilesTest,
  },
  {
    hook: "useSendFollowUpMessage",
    name: "send a follow-up message",
    description: "Sends a follow-up prompt to the model.",
    confirm:
      "Did a new message appear in the conversation (and the model reply)?",
    Test: SendFollowUpTest,
  },
  {
    hook: "useRegisterViewTool",
    name: "host invokes a view tool",
    description:
      "Registers a view tool, then asks the model (via follow-up) to call it and waits up to 60s for the invocation.",
    Test: RegisterViewToolTest,
  },
  {
    hook: "useRequestClose",
    name: "copy report and try to close",
    description:
      "Copy the report first, then ask the host to close this view. If it disappears, the hook works and the run ends here; only failures leave a row.",
    runLabel: "Close",
    Test: RequestCloseTest,
  },
];
