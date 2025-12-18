#!/usr/bin/env bash
set -e

VERSION=$1

if [ -z "$VERSION" ]; then
  echo "Error: Version argument is required"
  echo "Usage: $0 <version>"
  exit 1
fi

echo "Bumping version to: ${VERSION}"

pnpm --filter skybridge exec npm version "${VERSION}" --no-git-tag-version
pnpm --filter @skybridge/devtools exec npm version "${VERSION}" --no-git-tag-version

echo "Version bumped successfully"
