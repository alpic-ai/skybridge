# syntax=docker/dockerfile:1

# Dockerfile for a Skybridge MCP server.
#
# Detects npm, yarn, or pnpm from the lockfile in your project.
# (For bun or deno, adapt the install/build/prune commands below.)

# Build stage: install deps, compile the app, then prune dev deps.
FROM node:24-slim AS build
WORKDIR /app

COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* .npmrc* ./
RUN --mount=type=cache,target=/root/.npm \
    --mount=type=cache,target=/usr/local/share/.cache/yarn \
    --mount=type=cache,target=/root/.local/share/pnpm/store \
    if [ -f package-lock.json ]; then \
      npm ci; \
    elif [ -f yarn.lock ]; then \
      corepack enable yarn && yarn install --frozen-lockfile; \
    elif [ -f pnpm-lock.yaml ]; then \
      corepack enable pnpm && pnpm install --frozen-lockfile; \
    else \
      echo "No lockfile found." && exit 1; \
    fi

ENV NODE_ENV=production

COPY . .
RUN if [ -f package-lock.json ]; then \
      npm run build && npm prune --omit=dev; \
    elif [ -f yarn.lock ]; then \
      corepack enable yarn && yarn build && yarn install --frozen-lockfile --production=true; \
    elif [ -f pnpm-lock.yaml ]; then \
      corepack enable pnpm && pnpm build && pnpm prune --prod; \
    fi

# Runtime stage: copy built artifacts and prod deps, run as non-root.
FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

USER node

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json ./package.json

EXPOSE 3000

# Run the built server directly rather than via `npm start` / `skybridge start`.
# Each wrapper adds a process layer that can swallow SIGTERM, which makes
# graceful shutdowns time out on platforms like Cloud Run, Fly, and k8s.
CMD ["node", "dist/__entry.js"]
