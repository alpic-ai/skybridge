import {
  DECIDED,
  type HookDef,
  type MemberResult,
  type Runtime,
  type Support,
} from "./types.js";

export type ReportInput = {
  hooks: HookDef[];
  results: Record<string, MemberResult>;
  runtime: Runtime;
  appVersion: string;
  generatedAt: string;
};

export type ReportSummary = {
  markdown: string;
  supported: number;
  unsupported: number;
  error: number;
  untested: number;
  /** Decided = supported + unsupported + error. */
  decided: number;
};

const ICON: Record<Support, string> = {
  supported: "✅",
  unsupported: "⚠️",
  error: "❌",
  untested: "▫️",
};

export function supportOf(
  results: Record<string, MemberResult>,
  id: string,
): Support {
  return results[id]?.support ?? "untested";
}

export function countMembers(
  hooks: HookDef[],
  results: Record<string, MemberResult>,
): Record<Support, number> {
  const counts: Record<Support, number> = {
    supported: 0,
    unsupported: 0,
    error: 0,
    untested: 0,
  };
  for (const hook of hooks) {
    for (const member of hook.members) {
      counts[supportOf(results, member.id)] += 1;
    }
  }
  return counts;
}

/** Build the markdown report grouped by hook and member. */
export function buildReport(input: ReportInput): ReportSummary {
  const { hooks, results, runtime } = input;
  const counts = countMembers(hooks, results);
  const decided = DECIDED.reduce((sum, s) => sum + counts[s], 0);

  const lines: string[] = [];
  lines.push("# Skybridge Web Hooks Conformance");
  lines.push("");
  lines.push(`- **Host runtime:** \`${runtime}\``);
  lines.push(`- **Generated:** ${input.generatedAt}`);
  lines.push(`- **App:** skybridge-conformance v${input.appVersion}`);
  lines.push(
    `- **Supported:** ${counts.supported} / ${decided} decided members · ${counts.unsupported} unsupported · ${counts.error} error · ${counts.untested} untested`,
  );
  lines.push("");
  lines.push(
    "> `supported` = works on this host. `unsupported` = the host lacks it and Skybridge degraded gracefully. `error` = unexpected failure. `untested` = a manual member not yet run.",
  );
  lines.push("");

  for (const hook of hooks) {
    lines.push(`## ${hook.name} \`${hook.source}\``);
    lines.push(`_${hook.summary}_`);
    lines.push("");
    for (const member of hook.members) {
      const support = supportOf(results, member.id);
      const detail = results[member.id]?.detail;
      lines.push(
        `- ${ICON[support]} **${member.name}** — ${support}${detail ? `: ${detail}` : ""}`,
      );
    }
    lines.push("");
  }

  return {
    markdown: lines.join("\n"),
    supported: counts.supported,
    unsupported: counts.unsupported,
    error: counts.error,
    untested: counts.untested,
    decided,
  };
}
