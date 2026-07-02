import http from "node:http";
import type { Alpic } from "@alpic-ai/sdk";
import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDeployRouter } from "./deploy-router.js";

const mock = vi.hoisted(() => ({ alpic: {} as Record<string, unknown> }));
vi.mock("./alpic-sdk.js", () => ({ alpic: mock.alpic }));

const cleanups: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (cleanups.length > 0) {
    await cleanups.pop()?.();
  }
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
      },
    },
    projects: {
      loadConfig: vi.fn().mockReturnValue(null),
      validateLink: vi.fn().mockImplementation(async (cfg) => cfg),
      detectRuntime: vi.fn().mockReturnValue(null),
      createLinked: vi.fn().mockResolvedValue({
        projectId: "p-new",
        teamId: "t1",
        teamName: "Globex",
        projectName: "ok",
        environmentId: "env-1",
        environmentName: "production",
      }),
    },
    deployments: {
      getLatestForEnvironment: vi.fn(),
      deploy: vi.fn().mockResolvedValue({ status: "deployed" }),
    },
  } as unknown as Alpic;
}

async function start(alpic: Alpic) {
  Object.assign(mock.alpic, alpic);
  const app = express();
  app.use(express.json());
  app.use(createDeployRouter());
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
    expect(await res.json()).toMatchObject({
      state: "needsProject",
      defaultTeamId: "t1",
      teams: [
        { id: "t1", name: "Acme" },
        { id: "t2", name: "Globex" },
      ],
    });
  });

  it("flags staleConfig when the linked project no longer validates", async () => {
    const alpic = fakeAlpic({ teams: [{ id: "t1", name: "Acme" }] });
    vi.mocked(alpic.projects.loadConfig).mockReturnValue({
      projectId: "gone",
      teamId: "t1",
      projectName: "old",
    });
    vi.mocked(alpic.projects.validateLink).mockResolvedValue(null);
    const base = await start(alpic);
    const res = await fetch(`${base}/status`);
    expect(await res.json()).toMatchObject({
      state: "needsProject",
      staleConfig: true,
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
    expect(alpic.projects.createLinked).not.toHaveBeenCalled();
  });

  it("prechecks the submitted team, then creates the linked project", async () => {
    const alpic = fakeAlpic({ teams: [{ id: "t1", name: "Acme" }] });
    const base = await start(alpic);
    const res = await fetch(`${base}/project`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "fresh", teamId: "t2", teamName: "Globex" }),
    });
    expect(res.status).toBe(202);
    expect(alpic.api.projects.list.v1).toHaveBeenCalledWith({ teamId: "t2" });
    expect(alpic.projects.createLinked).toHaveBeenCalledWith({
      name: "fresh",
      teamId: "t2",
      teamName: "Globex",
      runtime: "node24",
    });
  });
});
