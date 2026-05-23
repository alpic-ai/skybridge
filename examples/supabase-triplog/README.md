# supabase-triplog

An example MCP app built with [Skybridge](https://docs.skybridge.tech/home): an interactive trip log widget backed by a Supabase table (`triplog`).

## What This Example Showcases

- **Supabase Integration**: Fetches live trip data from a Supabase table using `@supabase/supabase-js`
- **Clickable Carousel**: Horizontal scroll of trip cards — click any card to see full details
- **Rich Detail Panel**: Cover image, place, country, date, status badge, category chip, expenses, and notes
- **Client-side Filtering**: `status` (Completed / Ongoing / Up Next) and `category` filters applied in the UI
- **Focus Feature**: Pass `focusPlace` to auto-scroll and highlight a specific trip
- **Theme Support**: Adapts to light/dark mode via `useLayout()`

## Expected Table Schema (`triplog`)

| Column        | Type          | Notes                                              |
|---------------|---------------|----------------------------------------------------|
| `id`          | `integer`     | Primary key (auto-increment)                       |
| `created_at`  | `timestamptz` | Auto-set by Supabase                               |
| `date`        | `date`        | Trip date in YYYY-MM-DD format                     |
| `place`       | `text`        | City or location name (required)                   |
| `country`     | `text`        | Country name                                       |
| `description` | `text`        | Optional notes about the trip                      |
| `category`    | `text`        | `business`, `family`, `solo`, `adventure`, `leisure` |
| `status`      | `text`        | `completed`, `ongoing`, `upnext`                   |
| `expenses`    | `numeric`     | Total amount spent (non-negative)                  |
| `cover_url`   | `text`        | Public cover image URL                             |

## Getting Started

### Prerequisites

- Node.js 24+
- A Supabase project with the `triplog` table created

### Local Development

#### 1. Install

```bash
npm install
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

#### 3. Start the dev server

```bash
npm run dev
```

- MCP server: `http://localhost:3000/mcp`
- DevTools UI: `http://localhost:3000/`

## Project Structure

```
src/
├── server.ts                   # MCP server — browse-trips, create_trip, update_trip, delete_trip
├── supabase.ts                 # Supabase client
├── env.ts                      # Env var validation
├── helpers.ts                  # Typed useToolInfo / useCallTool hooks
├── types.ts                    # Trip type derived from server output
├── index.css                   # Widget styles
└── views/
    └── browse-trips.tsx        # Main widget view
components/
├── trip-carousel.tsx           # Scrollable card row
└── trip-detail.tsx             # Selected trip detail panel
```

## Resources

- [Skybridge Documentation](https://docs.skybridge.tech/)
- [Supabase Documentation](https://supabase.com/docs)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
