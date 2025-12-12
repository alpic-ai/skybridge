# Skybridge MCP Emulator

This is the standalone frontend emulator for the Skybridge MCP application.  
It is a React-based web app, designed for both local development and deployment.

## Getting Started

**Install dependencies:**

```sh
npm install
```

**To start the development server:**

```sh
npm run dev
```

- Make sure your mcp server is running and accessible at the URL specified in the `VITE_MCP_SERVER_URL` environment variable (default is `http://localhost:3000/mcp`)
- Open your browser to the URL printed in the terminal (usually http://localhost:5173/).

**To build for production:**

```sh
npm run build
```

**To preview the production build:**

```sh
npm run preview
```

**To lint the codebase:**

```sh
npm run lint
```

## Project Structure

- `src/` — React source code
- `dist/` — Output directory for production build (auto-generated)
- `index.html` — Main HTML template
- `vite.config.ts` — Vite configuration
- `eslint.config.js` — ESLint configuration

## Usage

To use the emulator in a Skybridge app during development, add the following to your server setup:

```js
if (env.NODE_ENV !== "production") {
  app.use(await emulatorStaticServer(server));
  app.use(await widgetsDevServer());
}
```

This will serve the emulator and widget development server in non-production environments.

## Notes

- Requires Node.js 18+.
- If you make changes to dependencies or configuration files, restart the dev server.
- PRs and issues are welcome!
