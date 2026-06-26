import {
  Component,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useMcpAppContext } from "skybridge/web";
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
  const value = useMcpAppContext("toolResult");
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
          ? runtime === "mcp-app"
            ? {
                support: "supported",
                detail: `useMcpAppContext returned ${JSON.stringify(payload)}`,
              }
            : {
                support: "error",
                detail: "returned a value off MCP Apps (expected a throw)",
              }
          : runtime === "mcp-app"
            ? {
                support: "error",
                detail: `threw on MCP Apps: ${errMessage(payload)}`,
              }
            : {
                support: "unsupported",
                detail: "MCP-Apps-only; throws on this host as documented",
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

export const useMcpAppContextHook: HookDef = {
  name: "useMcpAppContext",
  source: "skybridge/web",
  docPath: "use-mcp-app-context",
  summary: "Raw ext-apps bridge context (MCP Apps only; throws elsewhere).",
  members: [
    {
      id: "useMcpAppContext.read",
      name: "read(key)",
      description:
        "Read a raw MCP Apps context key; supported only on MCP Apps.",
      kind: "auto",
      Test: ReadMember,
    },
  ],
};
