---
sidebar_position: 1
---

# Add Skybridge to existing app

Skybridge contains 2 main packages that can be used together or independently.

## The packages

- **`skybridge/server`**: A drop-in replacement for the official MCP SDK that adds widget registration and type inference capabilities.
- **`skybridge/web`**: A React library providing hooks, components, and the runtime glue to render your widgets inside ChatGPT's iframe environment.

## Option 1: use `skybridge/server` (Recommended)

<div className="card-grid">
  <div className="card">
    <h3><a href="/quickstart/add-to-existing-app/server">Use skybridge/server</a></h3>
    <p>**Best if**: you're using the official TypeScript MCP SDK and want to add rich UI widgets with full type safety.</p>
  </div>
</div>

## Option 2: use `skybridge/web` only

<div className="card-grid">
  <div className="card">
    <h3><a href="/quickstart/add-to-existing-app/web">Use skybridge/web only</a></h3>
    <p>**Best if**: you already have an MCP server in a non-TypeScript runtime and only want React hooks for UI components.</p>
  </div>
</div>
