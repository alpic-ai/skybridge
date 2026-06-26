import {
  Component,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useAppsSdkContext } from "skybridge/web";
import { errMessage, useMemberReport, useRuntime } from "../context.js";
import type { HookDef, MemberResult } from "../types.js";

/** Catches the render-time throw from the probe so we can assert it. */
class ProbeBoundary extends Component<
  { onError: (error: unknown) => void; children: ReactNode },
  { errored: boolean }
> {
  state = { errored: false };
  static getDerivedStateFromError() {
    return { errored: true };
  }
  componentDidCatch(error: Error) {
    this.props.onError(error);
  }
  render() {
    return this.state.errored ? null : this.props.children;
  }
}

function Probe({ onValue }: { onValue: (v: unknown) => void }) {
  const value = useAppsSdkContext("displayMode");
  useEffect(() => {
    onValue(value);
  }, [value, onValue]);
  return null;
}

function ReadMember() {
  const runtime = useRuntime();
  const report = useMemberReport();
  const settled = useRef(false);
  const handle = useCallback(
    (kind: "value" | "error", payload: unknown) => {
      if (settled.current) {
        return;
      }
      settled.current = true;
      const result: MemberResult =
        kind === "value"
          ? runtime === "apps-sdk"
            ? {
                support: "supported",
                detail: `useAppsSdkContext returned ${JSON.stringify(payload)}`,
              }
            : {
                support: "error",
                detail: "returned a value off Apps SDK (expected a throw)",
              }
          : runtime === "apps-sdk"
            ? {
                support: "error",
                detail: `threw on Apps SDK: ${errMessage(payload)}`,
              }
            : {
                support: "unsupported",
                detail: "Apps-SDK-only; throws on this host as documented",
              };
      report(result);
    },
    [runtime, report],
  );

  return (
    <ProbeBoundary onError={(e) => handle("error", e)}>
      <Probe onValue={(v) => handle("value", v)} />
    </ProbeBoundary>
  );
}

export const useAppsSdkContextHook: HookDef = {
  name: "useAppsSdkContext",
  source: "skybridge/web",
  docPath: "use-apps-sdk-context",
  summary: "Raw window.openai context (Apps SDK only; throws elsewhere).",
  members: [
    {
      id: "useAppsSdkContext.read",
      name: "read(key)",
      description:
        "Read a raw Apps SDK context key; supported only on Apps SDK.",
      kind: "auto",
      Test: ReadMember,
    },
  ],
};
