# Skills over MCP

> **Experimental.** Tracks [SEP-2640](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2640), still under review. The API may change with the spec.

Ship [Agent Skills](https://agentskills.io/) — `SKILL.md` workflow instructions — alongside the server. Skybridge serves them as MCP resources under `skill://`, so hosts that adopt the standard can discover and read them. A skill teaches the agent *how* to orchestrate the server's tools; a tool description only says *what* each tool does.

## Enable

Place skills under `src/skills/`, one directory per skill, and set the option:

```typescript
const server = new McpServer(
  { name: "shop", version: "1.0" },
  {},
  { skills: true },
);
```

```
src/skills/
  refunds/
    SKILL.md          # required; frontmatter name must equal the directory name
    templates/email.md
```

```md
---
name: refunds
description: Process customer refund requests per company policy.
---

1. Look up the order with `get-order`.
2. ...
```

## What Skybridge does

- Validates every skill at build and dev startup (bad `name`, missing `description`, or name/dir mismatch fails the build).
- Exposes each file as a `skill://<name>/<path>` resource, plus `skill://index.json` (entries carry `url`, `sha256` digest, and verbatim frontmatter).
- Declares the `io.modelcontextprotocol/skills` capability.

## Usage notes

- **Pull-based**: the server never pushes a skill. To steer the model, reference a `skill://` URI from a tool description or tool result (e.g. `"see skill://refunds/SKILL.md"`).
- **Untrusted**: hosts treat skill content as model input, not a trusted directive — never rely on it for security decisions.
- **Lifecycle**: dev reads live from disk (edits need no restart); `skybridge build` snapshots skills into the bundle and serves them from memory, so it works on every deploy target (Cloudflare Workers, Vercel, Docker, Alpic Cloud).

See the [Skills guide](https://docs.skybridge.tech/guides/skills).
