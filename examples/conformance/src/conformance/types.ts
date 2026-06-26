import type { ComponentType } from "react";

/** The host runtime the view is currently running under. */
export type Runtime = "apps-sdk" | "mcp-app" | "unknown";

/**
 * Whether a hook member is supported on the current host.
 *
 * - `supported`   — the member does its job on this host.
 * - `unsupported` — the host doesn't expose this capability, and Skybridge
 *                   degraded gracefully (documented no-op / throw / isError).
 * - `error`       — it failed unexpectedly (a real problem to investigate).
 * - `untested`    — not run yet (a manual member awaiting the stepper).
 */
export type Support = "supported" | "unsupported" | "error" | "untested";

/** Statuses that count toward the "supported on this host" denominator. */
export const DECIDED: readonly Support[] = [
  "supported",
  "unsupported",
  "error",
];

export type MemberResult = {
  support: Support;
  /** One-line description of what was observed. */
  detail?: string;
};

/**
 * How a member is exercised:
 * - `auto`       — runs automatically when the page loads (reads, tool calls).
 * - `manual`     — has a visible/irreversible side effect, so it runs from the
 *                  stepper on an explicit user action (downloads, navigation…).
 * - `standalone` — like `manual`, but its action dismisses or replaces the view
 *                  (e.g. `requestClose`), so it renders inline in the results
 *                  list — never in the stepper — to be run last.
 */
export type MemberKind = "auto" | "manual" | "standalone";

export type Member = {
  /** Unique id, e.g. `useLayout.theme`. */
  id: string;
  /** The member's display name, e.g. `theme` or `setDisplayMode('fullscreen')`. */
  name: string;
  /** What this member exercises and how support is decided. */
  description: string;
  kind: MemberKind;
  /**
   * Auto members only: run this one in isolation (one at a time) instead of
   * mounted alongside the others. Set it when the test writes the shared host
   * `viewState` (useViewState / createStore), so concurrent writers don't
   * clobber each other. Read-only members omit it and stay mounted so they can
   * re-report when host-delivered data (e.g. tool input/output) arrives late.
   */
  serialized?: boolean;
  /**
   * Component that drives the hook member and reports its result. Auto members
   * report on mount; manual members render an action and report on click.
   */
  Test: ComponentType;
};

export type HookDef = {
  /** Hook name, e.g. `useLayout`. */
  name: string;
  /** Import source, e.g. `skybridge/web`. */
  source: string;
  /** `api-reference` doc slug. */
  docPath?: string;
  /** One-line summary of the hook. */
  summary: string;
  members: Member[];
};
