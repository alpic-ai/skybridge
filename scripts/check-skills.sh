#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../skills"

if find . -type l | grep .; then
  exit 1
fi

body() { awk 'n >= 2; /^---$/ { n++ }' "$1/SKILL.md"; }

for skill in chatgpt-app-builder mcp-app-builder; do
  diff -r skybridge/references "$skill/references"
  diff -u --label skybridge/SKILL.md --label "$skill/SKILL.md" <(body skybridge) <(body "$skill")
done
