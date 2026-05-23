# Supabase Triplog Example

An example MCP app built with [Skybridge](https://docs.skybridge.tech/home): an interactive trip log widget backed by a Supabase table (`triplog`), with full CRUD operations, filtering, and a cover image carousel.

## What This Example Showcases

- **Supabase Integration**: Fetches live trip data from a Supabase table using `@supabase/supabase-js`
- **CRUD via MCP Tools**: Create, read, update, and delete trips directly from the AI conversation
- **Clickable Carousel**: Horizontal scroll of trip cards — click any card to see full details
- **Rich Detail Panel**: Cover image, place, country, date, status badge, category chip, expenses, and notes
- **Client-side Filtering**: `status` (Completed / Ongoing / Up Next) and `category` filters applied in the UI
- **Focus Feature**: Pass `focusPlace` to auto-scroll and highlight a specific trip
- **Theme Support**: Adapts to light/dark mode via `useLayout()`
- **Env Validation**: Uses `@t3-oss/env-core` + Zod to validate env vars at startup

## Example Prompts

- Show me all my trips
- Log a new trip to Tokyo, Japan — solo adventure, completed last week
- Update my Paris trip expenses to $1200
- Delete the draft trip to Berlin

## Getting Started

### Prerequisites

- Node.js 24+
- A Supabase project with the `triplog` table created (see schema below)

### Local Development

#### 1. Install

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

#### 2. Configure Supabase

```bash
cp .env.example .env
```

Open `.env` and fill in:
- `SUPABASE_URL` — your project URL (e.g. `https://xxxx.supabase.co`)
- `SUPABASE_ANON_KEY` — your project's anon/public key

Both values are in **Supabase Dashboard → Project Settings → API**.

> **Cover images**: The widget CSP allows images from `*.supabase.co` and common CDNs. If your `cover_url` values point to other domains, add them to `resourceDomains` in `src/server.ts`.

#### 3. Start your local server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

This command starts:

- Your MCP server at `http://localhost:3000/mcp`.
- Skybridge DevTools UI at `http://localhost:3000/`.

#### 4. Project structure

```
src/
├── server.ts                   # MCP server — browse-trips, create_trip, update_trip, delete_trip
├── supabase.ts                 # Supabase client
├── env.ts                      # Env var validation (Zod + @t3-oss/env-core)
├── helpers.ts                  # Typed useToolInfo / useCallTool hooks
├── types.ts                    # Trip type derived from server output
├── index.css                   # Widget styles (light/dark, responsive)
├── vite-env.d.ts               # Vite type declarations
└── views/
    └── browse-trips.tsx        # Main widget view (filters, carousel, detail)
└── components/
    ├── trip-carousel.tsx       # Scrollable card row with arrow navigation
    └── trip-detail.tsx         # Selected trip detail panel
alpic.json                      # Deployment config
package.json
tsconfig.json
vite.config.ts
```

### Expected Table Schema (`triplog`)

Create this table in your Supabase project:

| Column        | Type          | Notes                                                |
|---------------|---------------|------------------------------------------------------|
| `id`          | `integer`     | Primary key (auto-increment)                         |
| `created_at`  | `timestamptz` | Auto-set by Supabase                                 |
| `date`        | `date`        | Trip date in YYYY-MM-DD format                       |
| `place`       | `text`        | City or location name (required)                     |
| `country`     | `text`        | Country name                                         |
| `description` | `text`        | Optional notes about the trip                        |
| `category`    | `text`        | `business`, `family`, `solo`, `adventure`, `leisure` |
| `status`      | `text`        | `completed`, `ongoing`, `upnext`                     |
| `expenses`    | `numeric`     | Total amount spent (non-negative)                    |
| `cover_url`   | `text`        | Public cover image URL                               |

### Create your first widget

#### 1. Add a new widget

- Register a widget in `src/server.ts` with a unique name (e.g., `my-widget`) using [`registerTool`](https://docs.skybridge.tech/api-reference/register-tool)
- Create a matching React component at `src/views/my-widget.tsx`. **The file name must match the widget name exactly**.

#### 2. Edit widgets with Hot Module Replacement (HMR)

Edit and save components in `src/views/` — changes will appear instantly inside your App.

#### 3. Edit server code

Modify files in `src/` and refresh the connection with your testing MCP Client to see the changes.

### Testing your App

You can test your App locally by using our DevTools UI on `http://localhost:3000` while running the dev command.

To test your app with other MCP Clients like ChatGPT, Claude or VSCode, see [Testing Your App](https://docs.skybridge.tech/quickstart/test-your-app).

## Deploy to Production

Skybridge is infrastructure vendor agnostic, and your app can be deployed on any cloud platform supporting MCP.

The simplest way to deploy your App in minutes is [Alpic](https://alpic.ai/).

1. Create an account on [Alpic platform](https://app.alpic.ai/).
2. Connect your GitHub repository to automatically deploy at each commit.
3. Use your remote App URL to connect it to MCP Clients, or use the Alpic Playground to easily test your App.

## Resources

- [Skybridge Documentation](https://docs.skybridge.tech/)
- [Supabase Documentation](https://supabase.com/docs)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Alpic Documentation](https://docs.alpic.ai/)
