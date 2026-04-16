#!/bin/bash
# Fetch all published skybridge versions from npm and extract unique major.minor pairs.
# Vector reloads enrichment tables automatically when the file changes.
set -euo pipefail

TMP=$(mktemp)
echo "version" > "$TMP"

curl -sf https://registry.npmjs.org/skybridge \
  | jq -r '.versions | keys[]' \
  | awk -F. '{print $1"."$2}' \
  | sort -uV \
  >> "$TMP"

# Only swap if we got at least one version (header + 1 data line)
if [ "$(wc -l < "$TMP")" -gt 1 ]; then
  chmod 644 "$TMP"
  mv "$TMP" /etc/vector/allowed-versions.csv
else
  rm -f "$TMP"
  echo "WARN: npm returned no versions, keeping existing allowed-versions.csv" >&2
fi
