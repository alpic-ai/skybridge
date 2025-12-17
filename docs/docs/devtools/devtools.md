---
sidebar_position: 1
---

# Skybridge MCP Devtools

This is the standalone frontend devtools for the Skybridge MCP application.  
It is a React-based web app, designed for both local development and deployment.

## Getting Started

**Install dependencies:**

```sh
pnpm install
```

**To start the development server:**

```sh
pnpm dev
```

- Open your browser to the URL printed in the terminal (usually http://localhost:5173/).

**To build for production:**

```sh
pnpm build
```

## Project Structure

- `src/` — React source code
- `dist/` — Output directory for production build (auto-generated)
- `index.html` — Main HTML template
- `vite.config.ts` — Vite configuration
- `eslint.config.js` — ESLint configuration

## Usage

To use the devtools in a Skybridge app during development, add the following to your server setup:

```js
if (env.NODE_ENV !== "production") {
  app.use(await devtoolsStaticServer());
  app.use(await widgetsDevServer());
}
```

This will serve the devtools and widget development server in non-production environments.
