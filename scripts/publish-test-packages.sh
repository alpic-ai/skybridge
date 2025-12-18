#!/usr/bin/env bash
set -e

pnpm --filter @skybridge/devtools exec npm publish --tag dev --access public --ignore-scripts

echo "Packages published successfully"
