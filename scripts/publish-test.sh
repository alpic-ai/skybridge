#!/usr/bin/env bash
set -e

SHORT_SHA=$(git rev-parse --short HEAD)
TEST_VERSION="0.0.0-dev.${SHORT_SHA}"

echo "Creating test version: ${TEST_VERSION}"

# First do skybridge
cd packages/core
npm version "${TEST_VERSION}" --no-git-tag-version
cd ../..

echo "Publishing skybridge to npm with 'dev' tag..."
pnpm --filter skybridge publish --tag dev --access public --no-git-checks

# Then devtools
# cd packages/devtools
# npm version "${TEST_VERSION}" --no-git-tag-version
# cd ../..

# echo "Publishing @skybridge/devtools to npm with 'dev' tag..."
# pnpm --filter @skybridge/devtools publish --tag dev --access public

# echo "Packages published successfully"
