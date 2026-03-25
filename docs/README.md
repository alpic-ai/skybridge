# Skybridge Documentation

This documentation site is built with [Mintlify](https://mintlify.com/).

If you're contributing to the docs, start with [DOCUMENTATION-MANIFESTO.md](./DOCUMENTATION-MANIFESTO.md). It is required reading for new documentation contributors and explains what belongs in the docs, how to write in Skybridge's voice, and what to verify before opening a PR.

## Local Development

```bash
pnpm install
pnpm dev
```

Opens a local preview at `http://localhost:3000`.

## Linting

```bash
pnpm lint
```

Checks for broken links.

## Deployment

Documentation is deployed on mintlify branch pushes, which automatically happen on release workflow.
