#!/usr/bin/env node
// Verifies the Vercel build + local `vercel dev` chain for examples/everything.
//
// Prereqs:
//   - From the repo root.
//   - `pnpm install` already ran.
//   - `vercel` CLI is on PATH and `vercel login` has happened, OR a project
//     is already linked (.vercel/ in examples/everything). The script does
//     not authenticate.
//
// Default flow (in order):
//   1. `pnpm --filter skybridge build`
//   2. `pnpm --filter everything exec skybridge build --target vercel`
//   3. Assert build artifacts exist under examples/everything.
//   4. Spawn `vercel dev --listen <port>` from examples/everything.
//   5. Wait up to 90s for ready signal.
//   6. Run the MCP / asset / health / GET-405 assertion battery.
//   7. Kill vercel dev.
//
// Flags:
//   --no-rebuild   Skip steps 1–2.
//   --url=<url>    Hit a deployed URL instead of vercel dev. Skips artifact checks.
//   --help, -h     Print usage and exit 0.

import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..");
const EXAMPLE_DIR = path.join(REPO_ROOT, "examples", "everything");

const HELP = `Usage: node scripts/verify-vercel.mjs [options]

Options:
  --no-rebuild      Skip the skybridge + example builds.
  --url=<url>       Hit a deployed URL instead of starting vercel dev.
                    Skips local artifact assertions and the manifest cross-check.
  --help, -h        Show this message.

Exit codes:
  0   All assertions passed.
  1   An assertion failed or vercel dev failed to start.
`;

function parseArgs(argv) {
  const opts = { rebuild: true, url: null };
  for (const arg of argv.slice(2)) {
    if (arg === "--help" || arg === "-h") {
      console.log(HELP);
      process.exit(0);
    } else if (arg === "--no-rebuild") {
      opts.rebuild = false;
    } else if (arg.startsWith("--url=")) {
      opts.url = arg.slice("--url=".length);
    } else {
      console.error(`Unknown option: ${arg}`);
      console.error(HELP);
      process.exit(1);
    }
  }
  return opts;
}

function log(msg) {
  process.stdout.write(`[verify-vercel] ${msg}\n`);
}

function fail(msg) {
  process.stderr.write(`[verify-vercel] FAIL: ${msg}\n`);
  process.exitCode = 1;
}

function ok(msg) {
  process.stdout.write(`[verify-vercel] ok: ${msg}\n`);
}

function runSync(cmd, args, cwd) {
  log(`$ ${cmd} ${args.join(" ")}  (cwd=${cwd})`);
  const result = spawnSync(cmd, args, { cwd, stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} exited with ${result.status}`);
  }
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
  });
}

function assertArtifacts() {
  const dist = path.join(EXAMPLE_DIR, "dist");
  const publicDir = path.join(EXAMPLE_DIR, "public");
  const apiDir = path.join(EXAMPLE_DIR, "api");
  const required = [
    [path.join(dist, "server.js"), "dist/server.js"],
    [path.join(dist, "vite-manifest.js"), "dist/vite-manifest.js"],
    [
      path.join(publicDir, "assets", ".vite", "manifest.json"),
      "public/assets/.vite/manifest.json",
    ],
    [path.join(apiDir, "mcp.js"), "api/mcp.js"],
    [path.join(EXAMPLE_DIR, "vercel.json"), "vercel.json"],
  ];
  for (const [p, label] of required) {
    if (!existsSync(p)) {
      throw new Error(`Missing build artifact: ${label}`);
    }
    ok(`artifact: ${label}`);
  }

  const apiEntry = readFileSync(path.join(apiDir, "mcp.js"), "utf-8");
  if (!apiEntry.includes('export { default } from "../dist/server.js"')) {
    throw new Error(
      `api/mcp.js does not re-export dist/server.js (got: ${apiEntry.trim()})`,
    );
  }
  ok("artifact: api/mcp.js re-exports ../dist/server.js");

  const vercelJson = JSON.parse(
    readFileSync(path.join(EXAMPLE_DIR, "vercel.json"), "utf-8"),
  );
  if (vercelJson.outputDirectory !== "public") {
    throw new Error('vercel.json: outputDirectory must equal "public"');
  }
  const hasMcpRewrite = Array.isArray(vercelJson.rewrites)
    && vercelJson.rewrites.some((r) => r.destination === "/api/mcp");
  if (!hasMcpRewrite) {
    throw new Error("vercel.json: missing rewrite to /api/mcp");
  }
  ok("artifact: vercel.json outputDirectory=public + /api/mcp rewrite");

  // Pick at least one .js entry from the manifest and confirm it's on disk.
  const manifest = loadManifest();
  const jsEntry = Object.values(manifest).find(
    (entry) => typeof entry?.file === "string" && entry.file.endsWith(".js"),
  );
  if (!jsEntry) {
    throw new Error("manifest contains no .js entry");
  }
  const assetPath = path.join(publicDir, "assets", jsEntry.file);
  if (!existsSync(assetPath)) {
    throw new Error(`manifest entry not on disk: ${jsEntry.file}`);
  }
  ok(`artifact: public/assets/${jsEntry.file}`);
}

function loadManifest() {
  const p = path.join(
    EXAMPLE_DIR,
    "public",
    "assets",
    ".vite",
    "manifest.json",
  );
  return JSON.parse(readFileSync(p, "utf-8"));
}

async function waitForReady(child, timeoutMs) {
  return new Promise((resolve, reject) => {
    let buf = "";
    const onData = (chunk) => {
      const text = chunk.toString();
      buf += text;
      process.stdout.write(text);
      if (/Ready! Available at/i.test(buf) || /Listening on/i.test(buf)) {
        cleanup();
        resolve();
      }
    };
    const onExit = (code) => {
      cleanup();
      reject(new Error(`vercel dev exited early with ${code}`));
    };
    const to = setTimeout(() => {
      cleanup();
      reject(new Error("vercel dev did not become ready in time"));
    }, timeoutMs);
    function cleanup() {
      clearTimeout(to);
      child.stdout?.off("data", onData);
      child.stderr?.off("data", onData);
      child.off("exit", onExit);
    }
    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
    child.on("exit", onExit);
  });
}

async function postMcp(base, body) {
  return fetch(`${base}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify(body),
  });
}

async function runAssertions(base, { checkManifest }) {
  const initBody = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      clientInfo: { name: "verify", version: "0.0.0" },
      capabilities: {},
    },
  };
  let res = await postMcp(base, initBody);
  if (res.status !== 200) {
    throw new Error(`init: expected 200, got ${res.status}`);
  }
  let body = await res.json();
  if (body?.result?.serverInfo?.name !== "alpic-openai-app") {
    throw new Error(
      `init: serverInfo.name mismatch (got ${JSON.stringify(body?.result?.serverInfo)})`,
    );
  }
  ok("init: 200 + serverInfo.name === alpic-openai-app");

  res = await postMcp(base, { jsonrpc: "2.0", id: 2, method: "tools/list" });
  body = await res.json();
  const tools = body?.result?.tools ?? [];
  if (!tools.some((t) => t.name === "show-everything")) {
    throw new Error("tools/list: show-everything not found");
  }
  ok("tools/list: includes show-everything");

  res = await postMcp(base, {
    jsonrpc: "2.0",
    id: 3,
    method: "resources/list",
  });
  body = await res.json();
  const resources = body?.result?.resources ?? [];
  const viewResource = resources.find((r) =>
    /show-everything\.html/.test(r.uri),
  );
  if (!viewResource) {
    throw new Error("resources/list: no show-everything.html resource");
  }
  ok(`resources/list: viewUri = ${viewResource.uri}`);

  res = await postMcp(base, {
    jsonrpc: "2.0",
    id: 4,
    method: "resources/read",
    params: { uri: viewResource.uri },
  });
  body = await res.json();
  const text = body?.result?.contents?.[0]?.text ?? "";
  if (!text.includes("/assets/")) {
    throw new Error("resources/read: HTML did not reference /assets/");
  }
  const match = text.match(/\/assets\/([^"' ]+\.js)/);
  if (!match) {
    throw new Error("resources/read: no /assets/*.js reference");
  }
  const assetFile = match[1];
  if (checkManifest) {
    const manifest = loadManifest();
    const known = new Set(Object.values(manifest).map((e) => e.file));
    if (!known.has(`assets/${assetFile}`) && !known.has(assetFile)) {
      throw new Error(
        `resources/read: ${assetFile} not in Vite manifest (${[...known].slice(0, 3).join(", ")} …)`,
      );
    }
  }
  ok(`resources/read: HTML references /assets/${assetFile}`);

  res = await fetch(`${base}/assets/${assetFile}`);
  if (res.status !== 200) {
    throw new Error(`assets-cors: ${assetFile} returned ${res.status}`);
  }
  if (res.headers.get("access-control-allow-origin") !== "*") {
    throw new Error("assets-cors: missing Access-Control-Allow-Origin: *");
  }
  ok(`assets-cors: /assets/${assetFile} 200 + CORS`);

  res = await fetch(`${base}/health`);
  if (res.status !== 200) {
    throw new Error(`health: expected 200, got ${res.status}`);
  }
  const health = await res.json();
  if (!health?.ok) {
    throw new Error("health: body did not include {ok:true}");
  }
  ok("health: 200 + {ok:true}");

  res = await fetch(`${base}/mcp`);
  if (res.status !== 405) {
    throw new Error(`mcp-get-405: expected 405, got ${res.status}`);
  }
  ok("mcp-get-405: GET /mcp returned 405");
}

async function main() {
  const opts = parseArgs(process.argv);

  if (opts.url) {
    log(`Using deployed URL: ${opts.url}`);
    await runAssertions(opts.url, { checkManifest: false });
    log("All assertions passed.");
    return;
  }

  if (opts.rebuild) {
    runSync("pnpm", ["--filter", "skybridge", "build"], REPO_ROOT);
    runSync(
      "pnpm",
      [
        "--filter",
        "everything",
        "exec",
        "skybridge",
        "build",
        "--target",
        "vercel",
      ],
      REPO_ROOT,
    );
  }

  assertArtifacts();

  const port = await findFreePort();
  const base = `http://127.0.0.1:${port}`;
  log(`Starting vercel dev on ${base}`);

  const child = spawn(
    "vercel",
    ["dev", "--listen", String(port), "--local", "--yes"],
    {
      cwd: EXAMPLE_DIR,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, VERCEL_FORCE_NO_BUILD_CACHE: "1" },
    },
  );

  let killed = false;
  const cleanup = () => {
    if (killed) {
      return;
    }
    killed = true;
    if (!child.killed) {
      child.kill("SIGTERM");
      setTimeout(() => {
        if (!child.killed) {
          child.kill("SIGKILL");
        }
      }, 5_000).unref();
    }
  };
  process.on("exit", cleanup);
  process.on("SIGINT", () => {
    cleanup();
    process.exit(130);
  });

  try {
    await waitForReady(child, 90_000);
    await runAssertions(base, { checkManifest: true });
    log("All assertions passed.");
  } finally {
    cleanup();
  }
}

main().catch((err) => {
  fail(err?.stack || String(err));
  process.exit(1);
});
