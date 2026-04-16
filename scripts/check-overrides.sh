#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PACKAGE_JSON="$ROOT_DIR/package.json"
LOCKFILE="$ROOT_DIR/pnpm-lock.yaml"
PINNED_FILE="$ROOT_DIR/scripts/pinned-overrides"

if ! command -v jq &>/dev/null; then
  echo "Error: jq is required. Install with: brew install jq" >&2
  exit 1
fi

# Backup originals
BACKUP_DIR=$(mktemp -d)
cp "$PACKAGE_JSON" "$BACKUP_DIR/package.json"
cp "$LOCKFILE" "$BACKUP_DIR/pnpm-lock.yaml"

cleanup() {
  cp "$BACKUP_DIR/package.json" "$PACKAGE_JSON"
  cp "$BACKUP_DIR/pnpm-lock.yaml" "$LOCKFILE"
  rm -rf "$BACKUP_DIR"
}
trap cleanup EXIT

# Load blocked packages (one per line). These must NEVER have overrides — force-remove if present.
BLOCKED_OVERRIDES=""
if [[ -f "$PINNED_FILE" ]]; then
  BLOCKED_OVERRIDES=$(grep -v '^\s*#' "$PINNED_FILE" | grep -v '^\s*$' || true)
fi

is_blocked() {
  local pkg="$1"
  echo "$BLOCKED_OVERRIDES" | grep -qx "$pkg"
}

# Collect overrides, skipping npm: alias overrides (package replacements, not security)
OVERRIDES_JSON=$(jq -c '.pnpm.overrides // {} | to_entries[] | select(.value | startswith("npm:") | not)' "$PACKAGE_JSON")
TOTAL=$(echo "$OVERRIDES_JSON" | grep -c '^' || true)

if [[ $TOTAL -eq 0 ]]; then
  echo "No security overrides found in package.json."
  exit 0
fi

echo "Checking $TOTAL security overrides..."
echo ""

# Capture baseline advisory IDs (with all overrides in place)
echo "  Running baseline audit..."
AUDIT_OUTPUT=$(pnpm audit --json 2>/dev/null) || true
if ! echo "$AUDIT_OUTPUT" | jq -e '.advisories' &>/dev/null; then
  echo "Error: pnpm audit failed or returned invalid JSON. Aborting to avoid removing valid overrides." >&2
  exit 1
fi
BASELINE_ADVISORIES=$(echo "$AUDIT_OUTPUT" | jq -r '[.advisories | keys[]] | sort | join(",")')
BASELINE_COUNT=$(echo "$BASELINE_ADVISORIES" | tr ',' '\n' | grep -c '.' || true)
echo "  Baseline: $BASELINE_COUNT advisories"
echo ""

REDUNDANT=0
REDUNDANT_KEYS=""

while IFS= read -r entry; do
  key=$(echo "$entry" | jq -r '.key')
  value=$(echo "$entry" | jq -r '.value')
  label="${key}@${value}"

  # Force-remove blocked overrides (packages that must never be overridden)
  if is_blocked "$key"; then
    echo "  ⊘ $label — BLOCKED (force-removed, see scripts/pinned-overrides)"
    REDUNDANT=$((REDUNDANT + 1))
    REDUNDANT_KEYS="${REDUNDANT_KEYS}${key}\n"
    continue
  fi

  # Restore clean state for each iteration
  cp "$BACKUP_DIR/package.json" "$PACKAGE_JSON"
  cp "$BACKUP_DIR/pnpm-lock.yaml" "$LOCKFILE"

  # Remove this single override
  jq --arg k "$key" 'del(.pnpm.overrides[$k])' "$PACKAGE_JSON" > "$PACKAGE_JSON.tmp"
  mv "$PACKAGE_JSON.tmp" "$PACKAGE_JSON"

  # Regenerate lockfile without this override
  if ! pnpm install --lockfile-only --ignore-scripts 2>/dev/null; then
    echo "  ? $label — install failed, skipping"
    continue
  fi

  # Compare advisories without this override vs baseline
  AUDIT_OUTPUT=$(pnpm audit --json 2>/dev/null) || true
  if ! echo "$AUDIT_OUTPUT" | jq -e '.advisories' &>/dev/null; then
    echo "  ? $label — audit failed, skipping"
    continue
  fi
  WITHOUT_ADVISORIES=$(echo "$AUDIT_OUTPUT" | jq -r '[.advisories | keys[]] | sort | join(",")')

  if [[ "$WITHOUT_ADVISORIES" != "$BASELINE_ADVISORIES" ]]; then
    echo "  ✓ $label — still needed"
  else
    echo "  ✗ $label — REDUNDANT (safe to remove)"
    REDUNDANT=$((REDUNDANT + 1))
    REDUNDANT_KEYS="${REDUNDANT_KEYS}${key}\n"
  fi
done <<< "$OVERRIDES_JSON"

echo ""
echo "Summary: $REDUNDANT/$TOTAL overrides can be removed"

if [[ $REDUNDANT -gt 0 ]]; then
  # Remove redundant overrides from the original backup, then write it back
  cp "$BACKUP_DIR/package.json" "$PACKAGE_JSON"
  while IFS= read -r key; do
    [[ -z "$key" ]] && continue
    jq --arg k "$key" 'del(.pnpm.overrides[$k])' "$PACKAGE_JSON" > "$PACKAGE_JSON.tmp"
    mv "$PACKAGE_JSON.tmp" "$PACKAGE_JSON"
  done <<< "$(echo -e "$REDUNDANT_KEYS")"

  # Regenerate lockfile with cleaned overrides
  echo ""
  echo "Removing redundant overrides and regenerating lockfile..."
  pnpm install --lockfile-only --ignore-scripts 2>/dev/null

  # Disable the cleanup trap since we want to keep the modified files
  trap - EXIT
  rm -rf "$BACKUP_DIR"

  echo ""
  echo "Removed:"
  echo -e "$REDUNDANT_KEYS" | while IFS= read -r key; do
    [[ -z "$key" ]] && continue
    echo "  - $key"
  done
  echo ""
  echo "Run 'pnpm install' to update node_modules."
fi
