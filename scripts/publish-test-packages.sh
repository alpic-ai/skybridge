#!/usr/bin/env bash
set -e

pnpm --filter @skybridge/devtools publish --tag dev --access public --ignore-scripts --no-git-checks

echo "Packages published successfully"
