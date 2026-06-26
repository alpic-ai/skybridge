import { useRef } from "react";
import { useViewState } from "skybridge/web";
import { useAsyncAuto, useAutoReport } from "../context.js";
import type { HookDef } from "../types.js";

/** Resolve after the next render commits so a state ref reflects the update. */
const nextTick = () => new Promise((resolve) => setTimeout(resolve, 60));

function ReadMember() {
  const [state] = useViewState<{ vsRead?: string }>({ vsRead: "seed" });
  // Capture the value on the FIRST render; later renders may be reset by the
  // shared host viewState, but the default-seeding result is what we assert.
  const first = useRef(state.vsRead);
  useAutoReport(
    first.current === "seed"
      ? {
          support: "supported",
          detail: "useViewState returned the default state on first render",
        }
      : {
          support: "unsupported",
          detail: "host already had view state, so the default was not applied",
        },
  );
  return null;
}

function WriteMember() {
  const [state, setState] = useViewState<{ vsWrite?: number }>({ vsWrite: 0 });
  const stateRef = useRef(state);
  stateRef.current = state;
  useAsyncAuto(async () => {
    const next = (stateRef.current.vsWrite ?? 0) + 1;
    setState((prev) => ({ ...prev, vsWrite: next }));
    await nextTick();
    return stateRef.current.vsWrite === next
      ? {
          support: "supported" as const,
          detail: `setViewState updated the value (vsWrite=${next})`,
        }
      : {
          support: "error" as const,
          detail: `expected vsWrite=${next}, read ${stateRef.current.vsWrite}`,
        };
  });
  return null;
}

export const useViewStateHook: HookDef = {
  name: "useViewState",
  source: "skybridge/web",
  docPath: "use-view-state",
  summary: "Persist UI state on the host across renders.",
  members: [
    {
      id: "useViewState.read",
      name: "read default",
      description: "Returns the default state when the host has none.",
      kind: "auto",
      Test: ReadMember,
    },
    {
      id: "useViewState.write",
      name: "setViewState",
      description: "Writing updates the value and persists it to the host.",
      kind: "auto",
      serialized: true,
      Test: WriteMember,
    },
  ],
};
