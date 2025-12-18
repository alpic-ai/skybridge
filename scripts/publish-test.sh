#!/usr/bin/env bash
set -e

SHORT_SHA=$(git rev-parse --short HEAD)
SUFFIX=${GITHUB_RUN_NUMBER:-local}
TEST_VERSION="0.0.0-dev.${SHORT_SHA}.${SUFFIX}"

echo "Creating test version: ${TEST_VERSION}"

pnpm --filter skybridge exec npm version "${TEST_VERSION}" --no-git-tag-version
pnpm --filter @skybridge/devtools exec npm version "${TEST_VERSION}" --no-git-tag-version

pnpm --filter skybridge exec npm publish --tag dev --access public --ignore-scripts

unset NODE_AUTH_TOKEN NPM_TOKEN
rm -f ~/.npmrc
pnpm --filter @skybridge/devtools exec npm publish --tag dev --access public --ignore-scripts

echo "Packages published successfully"
