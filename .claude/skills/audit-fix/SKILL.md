---
name: audit-fix
description: Run pnpm audit, fix vulnerabilities by bumping direct deps and adding overrides, clean stale overrides, and summarize changes.
---

# Audit Fix Skill

Automated security audit remediation for the monorepo. Fixes what it can, reports what it can't.

## Phase 1: Capture Current State

Run `pnpm audit --json` and read the output. Note the advisory count, severity breakdown (from `.metadata.vulnerabilities`), and each advisory's package name, severity, patched version, and dependency path. This is the "BEFORE" state — remember it for the final summary.

## Phase 2: Fix via Direct Dependency Bumps

For each advisory, check if the vulnerable package is a **direct dependency** in any workspace `package.json` (root or workspace packages) by grepping for it.

For each match:
1. Check if bumping to the patched version is possible: `pnpm outdated <package>` in the relevant workspace
2. If a patched version exists, update the version in the workspace `package.json`
3. Run `pnpm install` after all direct bumps are done

**Do NOT bump major versions without asking the user first.** Minor and patch bumps are safe to apply.

## Phase 3: Fix via Overrides

Run `pnpm audit --json` again to see what remains after direct bumps.

For each remaining advisory where:
- The vulnerable package is a **transitive dependency** (not direct)
- A patched version exists (`patched_versions` is not `<0.0.0`)
- The package is **NOT listed in `scripts/pinned-overrides`** (blocked packages must never be overridden)

Add an override to `pnpm.overrides` in the root `package.json`.

### Override format: always use scoped `>` selectors

**Never use global (unscoped) overrides** (e.g. `"zod": "^3.25.76"`). A global override unifies **all** consumers in the monorepo to a single version satisfying the override range, regardless of what each package actually needs. For example, if mintlify depends on `"zod": "^3.25.76"` and `@modelcontextprotocol/sdk` depends on `"zod": "^4"`, adding `"zod": "^3.25.76"` in overrides resolves a single Zod 3 version for **both** — effectively breaking the SDK which requires Zod 4.

Also **never use the `>=` operator** in overrides — prefer `^` (caret). `>=3.25.76` can resolve to Zod 4, which may break consumers that expect Zod 3. `^3.25.76` stays within the same major version.

Instead, **target the direct parent package** from the audit path using the `>` selector:

```
Audit path:  docs>mintlify>@mintlify/cli>@mintlify/previewing>express
Override:    "@mintlify/previewing>express": "^4.20.0"
                       ↑ direct parent          ↑ vulnerable dep
```

Key rules for `>` selectors:
- The `>` selector only matches **direct parent-child** relationships, not recursive/transitive
- If the audit reports multiple paths through different parents, add a separate override for each direct parent
- Use `^<patched_version>` when the fix is a minor/patch bump within the same major
- Use a pinned version (e.g. `"3.24.0"`) when the latest would cross a major version boundary and break the consumer
- Glob patterns like `@scope/**>dep` are **not reliably supported** — always use explicit package names
- Skip packages that already have an override

### Example: multiple paths for the same vulnerability

```jsonc
// Audit flags js-yaml via 5 different @mintlify packages:
"@mintlify/cli>js-yaml": "^4.1.1",
"@mintlify/common>js-yaml": "^4.1.1",
"@mintlify/scraping>js-yaml": "^4.1.1",
"@mintlify/validation>js-yaml": "^4.1.1",
"@mintlify/prebuild>js-yaml": "^4.1.1"
```

After adding overrides, re-run `pnpm audit` iteratively — new paths may appear as pnpm resolves the dependency tree differently.

Then run `pnpm install --lockfile-only --ignore-scripts` to apply.

## Phase 4: Clean Stale Overrides

Run the existing override check script:

```bash
bash scripts/check-overrides.sh
```

This will automatically remove any overrides that are no longer needed (including ones that may have existed before this skill ran) and regenerate the lockfile.

## Phase 5: Final Audit & Summary

Run `pnpm audit --json` one last time for the "AFTER" state.

Present a before/after comparison:

```
## Audit Summary

### Before
- Total advisories: X
- Critical: X | High: X | Moderate: X | Low: X

### Actions Taken
- Bumped direct dependencies:
  - <package>: <old> → <new> (in <workspace>)
- Added overrides:
  - <package>: <version>
- Removed stale overrides:
  - <package>

### After
- Total advisories: X
- Critical: X | High: X | Moderate: X | Low: X

### Remaining (no fix available)
- <package> (<severity>) — <reason: no patched version / unpatchable>
```

## Important Rules

- **Never remove a direct dependency** — only bump versions
- **Never add overrides for `npm:` alias replacements** — those are intentional package swaps
- **Never override blocked packages** — packages listed in `scripts/pinned-overrides` must never get overrides added (they have compatibility constraints that conflict with security fixes)
- **Ask before major version bumps** — they may have breaking changes
- **Always run `pnpm install` at the end** to ensure node_modules are in sync
- **Commit nothing** — leave changes staged for the user to review
