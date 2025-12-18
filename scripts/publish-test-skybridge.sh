#!/usr/bin/env bash
set -e

pnpm --filter skybridge exec npm publish --tag dev --access public --ignore-scripts

echo "Packages published successfully"
