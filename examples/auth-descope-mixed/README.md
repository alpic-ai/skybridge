# Skybridge Auth Example — Mixed public/authenticated tools (Descope)

A single MCP server that serves both anonymous and signed-in callers, wired with
the branded `descopeProvider`. It exists to exercise every mixed-auth case
through the one `auth` field on a tool, with no hand-wired middleware and no
per-handler auth guards.

For the fully-authenticated variant (every tool requires sign-in), see
[`auth-descope`](../auth-descope).

> The `auth` field used here ships with the framework from this branch, so this
> example links `skybridge` via `workspace:*` and is run from inside the
> monorepo (`pnpm install` at the root). It switches to a published version once
> `auth` is released.

## The cases

| Tool | `auth` declaration | Compiles to | Behavior |
| --- | --- | --- | --- |
| `browse-catalog` | `{ allowsAnonymous: true }` | `[{noauth},{oauth2}]` | Callable signed out; uses the token when present (greets you by name). |
| `whoami` | *(omitted)* | `[{oauth2}]` | No declaration → secure default: sign-in required. |
| `checkout` | `{ scopes: ["checkout"] }` | `[{oauth2, scopes:["checkout"]}]` | Requires sign-in **and** the `checkout` scope. |

Declaring `browse-catalog` with `allowsAnonymous` is what flips the server into
mixed mode: the `/mcp` door starts accepting anonymous requests, and every other
tool stays sign-in-gated, enforced by the framework before the handler runs.

## What to test

**Anonymous (no token)**
- `browse-catalog` → succeeds, returns "Catalog for guest…".
- `whoami`, `checkout` → denied with `mcp/www_authenticate`, so the host
  surfaces its sign-in UI.

**Signed in, without the `checkout` scope**
- `browse-catalog` → greets you by name.
- `whoami` → succeeds.
- `checkout` → denied with `insufficient_scope`.

**Signed in, with the `checkout` scope**
- All three tools succeed.

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
