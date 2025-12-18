#!/usr/bin/env bash

set -e

SHORT_SHA=$(git rev-parse --short HEAD)
TEST_VERSION="0.0.0-dev.${SHORT_SHA}"

echo "Bumping version to: ${TEST_VERSION}"

pnpm --filter skybridge exec npm version "${TEST_VERSION}" --no-git-tag-version
pnpm --filter @skybridge/devtools exec npm version "${TEST_VERSION}" --no-git-tag-version

echo "Version bumped successfully"
