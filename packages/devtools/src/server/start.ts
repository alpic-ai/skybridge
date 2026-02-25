import { createClaudeSessionServer } from "./claude-session-server.js";

const port = Number(process.env.CLAUDE_WS_PORT ?? 3001);
const cwd = process.env.CLAUDE_CWD ?? process.cwd();

const server = createClaudeSessionServer({ port, cwd });
console.log(`Claude session server listening on ws://localhost:${server.port}`);
