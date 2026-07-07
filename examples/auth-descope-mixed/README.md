# Skybridge Auth Example — Mixed public/authenticated tools (Descope)

A single MCP server that serves both anonymous and signed-in callers, wired with
the branded `descopeProvider`. It exists to exercise every mixed-auth case
through each tool's `securitySchemes`, with no hand-wired middleware and no
per-handler auth guards: with an `oauth` provider configured, the framework
enforces each tool's declared schemes before the handler runs.

For the fully-authenticated variant (every tool requires sign-in), see
[`auth-descope`](../auth-descope).

> The per-tool enforcement used here ships with the framework from this branch,
> so this example links `skybridge` via `workspace:*` and is run from inside the
> monorepo (`pnpm install` at the root).

## The cases

| Tool | `securitySchemes` | Behavior |
| --- | --- | --- |
| `browse-catalog` | `[{noauth},{oauth2}]` | Callable signed out; uses the token when present (greets you by name). |
| `whoami` | `[{oauth2}]` | Requires sign-in. |
| `checkout` | `[{oauth2, scopes:["checkout"]}]` | Requires sign-in **and** the `checkout` scope. |
| `account` | *(omitted)* | No declaration → secure default: sign-in required. |

Declaring a `noauth` scheme on `browse-catalog` is what flips the server into
mixed mode: the `/mcp` door starts accepting anonymous requests, and every other
tool stays sign-in-gated, enforced by the framework before the handler runs.

## What to test

**Anonymous (no token)**
- `browse-catalog` → succeeds, returns "Catalog for guest…".
- `whoami`, `checkout`, `account` → denied with `mcp/www_authenticate`, so the
  host surfaces its sign-in UI.

**Signed in, without the `checkout` scope**
- `browse-catalog` → greets you by name.
- `whoami`, `account` → succeed.
- `checkout` → denied with `insufficient_scope`.

**Signed in, with the `checkout` scope**
- All four tools succeed.

## Setup

1. Create a Descope project and an MCP Server with Dynamic Client Registration
   enabled (see [`auth-descope`](../auth-descope) for the console walkthrough).
2. Grant a `checkout` scope so it can be issued into a token, to exercise the
   scoped case.
3. Copy `.env.example` to `.env` and set `DESCOPE_MCP_SERVER_URL`.
4. Install and run:

   ```bash
   npm install
   npm run dev
   ```

The devtools emulator connects anonymously, shows a sign-in CTA, and disables the
auth-required tools until you sign in — a quick way to walk the cases above
before testing in a real host.
