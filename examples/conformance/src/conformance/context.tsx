import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { MemberResult, Runtime } from "./types.js";

/** Normalize any thrown value into a readable message. */
export function errMessage(e: unknown): string {
  if (e instanceof Error) {
    return e.message;
  }
  if (typeof e === "string") {
    return e;
  }
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

/** Detect the host runtime from the globals the host injects on `window`. */
export function detectRuntime(): Runtime {
  const hostType =
    typeof window !== "undefined" ? window.skybridge?.hostType : undefined;
  if (hostType === "apps-sdk" || hostType === "mcp-app") {
    return hostType;
  }
  return "unknown";
}

type ConformanceContextValue = {
  runtime: Runtime;
  results: Record<string, MemberResult>;
  report: (id: string, result: MemberResult) => void;
};

const ConformanceContext = createContext<ConformanceContextValue | null>(null);

/** Current member id, provided around each member's Test component. */
const MemberIdContext = createContext<string | null>(null);

export function ConformanceProvider({ children }: { children: ReactNode }) {
  const [results, setResults] = useState<Record<string, MemberResult>>({});
  const runtime = useMemo(() => detectRuntime(), []);

  const report = useCallback((id: string, result: MemberResult) => {
    setResults((prev) => {
      const existing = prev[id];
      if (
        existing &&
        existing.support === result.support &&
        existing.detail === result.detail
      ) {
        return prev;
      }
      return { ...prev, [id]: result };
    });
  }, []);

  const value = useMemo<ConformanceContextValue>(
    () => ({ runtime, results, report }),
    [runtime, results, report],
  );

  return (
    <ConformanceContext.Provider value={value}>
      {children}
    </ConformanceContext.Provider>
  );
}

export function useConformance(): ConformanceContextValue {
  const ctx = useContext(ConformanceContext);
  if (!ctx) {
    throw new Error("useConformance must be used within <ConformanceProvider>");
  }
  return ctx;
}

export function useRuntime(): Runtime {
  return useConformance().runtime;
}

/** Scope reporting to one member id (wraps each Test). */
export function MemberProvider({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <MemberIdContext.Provider value={id}>{children}</MemberIdContext.Provider>
  );
}

function useMemberId(): string {
  const id = useContext(MemberIdContext);
  if (!id) {
    throw new Error("Member hooks must be used within a <MemberProvider>");
  }
  return id;
}

/** Report a result for the surrounding member. The returned fn is stable. */
export function useMemberReport(): (result: MemberResult) => void {
  const { report } = useConformance();
  const id = useMemberId();
  return useCallback(
    (result: MemberResult) => report(id, result),
    [report, id],
  );
}

/**
 * Report a synchronously-computed result, re-reporting when it changes.
 * For `auto` members that read host state during render.
 */
export function useAutoReport(result: MemberResult): void {
  const report = useMemberReport();
  const ref = useRef(result);
  ref.current = result;
  const key = `${result.support}::${result.detail ?? ""}`;
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-report only when the serialized result changes; the ref holds the latest value.
  useEffect(() => {
    report(ref.current);
  }, [key, report]);
}

/**
 * Run an async assertion once on mount and report it. For `auto` members that
 * must await something (a tool call, a settle delay) with no side effect.
 */
export function useAsyncAuto(fn: () => Promise<MemberResult>): void {
  const report = useMemberReport();
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => {
    let cancelled = false;
    fnRef
      .current()
      .then((r) => {
        if (!cancelled) {
          report(r);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          report({ support: "error", detail: errMessage(e) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [report]);
}

/**
 * Wire up a `manual` member's action. Returns `run` (call from a button) and
 * `busy`. Reports the function's result, or `error` if it throws.
 */
export function useManualRun(fn: () => MemberResult | Promise<MemberResult>): {
  run: () => void;
  busy: boolean;
} {
  const report = useMemberReport();
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const [busy, setBusy] = useState(false);

  const run = useCallback(() => {
    setBusy(true);
    Promise.resolve()
      .then(() => fnRef.current())
      .then((r) => report(r))
      .catch((e) => report({ support: "error", detail: errMessage(e) }))
      .finally(() => setBusy(false));
  }, [report]);

  return { run, busy };
}
