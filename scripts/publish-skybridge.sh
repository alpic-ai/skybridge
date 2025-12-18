#!/usr/bin/env bash
set -e

TAG=${1:-dev}

pnpm --filter skybridge publish --tag "$TAG" --access public --ignore-scripts  --no-git-checks

echo "Packages published successfully"
