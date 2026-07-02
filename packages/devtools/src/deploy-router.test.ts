import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import express from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDeployRouter } from "./deploy-router.js";

type Alpic = NonNullable<Parameters<typeof createDeployRouter>[0]>;

const cleanups: Array<() => Promise<void>> = [];

// Isolate cwd per test: the router reads/writes `.alpic/project.json` against
// process.cwd(), so a fresh tmp dir keeps tests independent and pollution-free.
let originalCwd: string;
let tmpCwd: string;
beforeEach(() => {
  originalCwd = process.cwd();
  tmpCwd = mkdtempSync(join(tmpdir(), "deploy-router-"));
  process.chdir(tmpCwd);
});

afterEach(async () => {
  while (cleanups.length > 0) {
    await cleanups.pop()?.();
  }
  process.chdir(originalCwd);
  rmSync(tmpCwd, { recursive: true, force: true });
});

function fakeAlpic(overrides: {
  whoami?: unknown;
  teams?: unknown[];
  projects?: { id: string; name: string }[];
}): Alpic {
  return {
    whoami: vi.fn().mockResolvedValue(overrides.whoami ?? { method: "oauth" }),
    api: {
      teams: { list: { v1: vi.fn().mockResolvedValue(overrides.teams ?? []) } },
      projects: {
        list: { v1: vi.fn().mockResolvedValue(overrides.projects ?? []) },
        create: {
          v1: vi.fn().mockResolvedValue({
            id: "p-new",
            teamId: "t1",
            name: "ok",
            productionEnvironment: { id: "env-1", name: "production" },
          }),
        },
        get: { v1: vi.fn() },
      },
    },
    deployments: {
      getLatestForEnvironment: vi.fn(),
      deploy: vi.fn().mockResolvedValue({ status: "deployed" }),
    },
  } as unknown as Alpic;
}

async function start(alpic: Alpic) {
  const app = express();
  app.use(express.json());
  app.use(createDeployRouter(alpic));
  const server = http.createServer(app);
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as { port: number }).port;
  cleanups.push(() => new Promise<void>((r) => server.close(() => r())));
  return `http://127.0.0.1:${port}/__skybridge/deploy`;
}

describe("deploy-router /status", () => {
  it("reports signedOut when unauthenticated", async () => {
    const base = await start(
      fakeAlpic({ whoami: { method: "unauthenticated" } }),
    );
    const res = await fetch(`${base}/status`);
    expect(await res.json()).toEqual({ state: "signedOut" });
  });

  it("reports noTeam when the user has no teams", async () => {
    const base = await start(fakeAlpic({ teams: [] }));
    const res = await fetch(`${base}/status`);
    expect(await res.json()).toEqual({ state: "noTeam" });
  });

  it("reports needsProject with all teams + a default team", async () => {
    const base = await start(
      fakeAlpic({
        teams: [
          { id: "t1", name: "Acme" },
          { id: "t2", name: "Globex" },
        ],
      }),
    );
    const res = await fetch(`${base}/status`);
    // No .alpic/project.json in the per-test tmp cwd → first-deploy state.
    expect(await res.json()).toMatchObject({
      state: "needsProject",
      defaultTeamId: "t1",
      teams: [
        { id: "t1", name: "Acme" },
        { id: "t2", name: "Globex" },
      ],
    });
  });
});

describe("deploy-router POST /project", () => {
  it("409s on a name conflict instead of creating", async () => {
    const alpic = fakeAlpic({
      teams: [{ id: "t1", name: "Acme" }],
      projects: [{ id: "p1", name: "taken" }],
    });
    const base = await start(alpic);
    const res = await fetch(`${base}/project`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "taken", teamId: "t1" }),
    });
    expect(res.status).toBe(409);
    expect(alpic.api.projects.create.v1).not.toHaveBeenCalled();
  });

  it("prechecks + creates under the submitted team, then writes config", async () => {
    const alpic = fakeAlpic({ teams: [{ id: "t1", name: "Acme" }] });
    const base = await start(alpic);
    const res = await fetch(`${base}/project`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "fresh", teamId: "t2", teamName: "Globex" }),
    });
    expect(res.status).toBe(202);
    expect(alpic.api.projects.list.v1).toHaveBeenCalledWith({ teamId: "t2" });
    expect(alpic.api.projects.create.v1).toHaveBeenCalledWith(
      expect.objectContaining({ teamId: "t2", name: "fresh" }),
    );
    const cfg = JSON.parse(
      readFileSync(join(process.cwd(), ".alpic", "project.json"), "utf8"),
    );
    expect(cfg).toMatchObject({ projectId: "p-new", teamName: "Globex" });
  });
});
