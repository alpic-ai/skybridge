#!/usr/bin/env bash

set -e

if [ -n "$1" ]; then
  VERSION="$1"
else
  SHORT_SHA=$(git rev-parse --short HEAD)
  VERSION="0.0.0-dev.${SHORT_SHA}"
fi

echo "Bumping version to: ${VERSION}"

pnpm --filter skybridge exec npm version "${VERSION}" --no-git-tag-version
pnpm --filter @skybridge/devtools exec npm version "${VERSION}" --no-git-tag-version

echo "Version bumped successfully"
