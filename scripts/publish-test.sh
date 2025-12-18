#!/usr/bin/env bash
set -e

SHORT_SHA=$(git rev-parse --short HEAD)
TEST_VERSION="0.0.0-dev.${SHORT_SHA}"

echo "Creating test version: ${TEST_VERSION}"

# Publish Skybridge
cd packages/core
npm version "${TEST_VERSION}" --no-git-tag-version

echo "Publishing skybridge to npm with 'dev' tag..."
npm publish --tag dev --access public

cd ../..

# Publish Devtools
cd packages/devtools
npm version "${TEST_VERSION}" --no-git-tag-version

echo "Publishing @skybridge/devtools to npm with 'dev' tag..."
npm publish --tag dev --access public

echo "Packages published successfully"
