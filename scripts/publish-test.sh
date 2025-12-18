#!/usr/bin/env bash
set -e

SHORT_SHA=$(git rev-parse --short HEAD)
SUFFIX=${GITHUB_RUN_NUMBER:-local}
TEST_VERSION="0.0.0-dev.${SHORT_SHA}.${SUFFIX}"

echo "Creating test version: ${TEST_VERSION}"

# Update versions first
pnpm -C packages/core exec npm version "${TEST_VERSION}" --no-git-tag-version
pnpm -C packages/devtools exec npm version "${TEST_VERSION}" --no-git-tag-version

# Now publish the packages
pnpm --filter skybridge publish --tag dev --access public --no-git-checks
pnpm --filter @skybridge/devtools publish --tag dev --access public --no-git-checks

echo "Packages published successfully"
