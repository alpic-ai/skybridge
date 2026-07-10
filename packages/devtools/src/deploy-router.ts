import type { DeploymentStatus, DeployResult } from "@alpic-ai/sdk";
import express, { type Router } from "express";
import { alpic } from "./alpic-sdk.js";

type DeployState =
  | { status: "idle" }
  | {
      status: "deploying";
      // Held in server state and replayed over SSE so the client's elapsed
      // clock survives hover remounts and page refreshes.
      startedAt: number;
      deploymentPageUrl: string | null;
    }
  | {
      status: "deployed";
      mcpServerUrl: string;
      deploymentPageUrl: string | null;
    }
  | { status: "failed"; message: string; deploymentPageUrl: string | null };

const errMessage = (err: unknown, fallback: string): string =>
  err instanceof Error ? err.message : fallback;

/**
 * Dev-only router that drives the devtools Deploy button. Runs `@alpic-ai/sdk`
 * in-process (no CLI spawning): `/status` is a plain request, deploy progress
 * streams over SSE at `/events`.
 */
export function createDeployRouter(): Router {
  const router = express.Router();

  let state: DeployState = { status: "idle" };
  const subscribers = new Set<express.Response>();

  const write = (res: express.Response, s: DeployState) => {
    res.write(`event: state\ndata: ${JSON.stringify(s)}\n\n`);
  };
  const setState = (s: DeployState) => {
    state = s;
    for (const res of subscribers) {
      write(res, s);
    }
  };

  const runDeploy = async (environmentId: string, teamId: string) => {
    const startedAt = Date.now();
    setState({ status: "deploying", startedAt, deploymentPageUrl: null });
    let pageUrl: string | null = null;
    try {
      const result: DeployResult = await alpic.deployments.deploy({
        environmentId,
        teamId,
        onProgress: (event) => {
          if (event.type === "deploying" && event.deploymentPageUrl) {
            pageUrl = event.deploymentPageUrl;
          }
          setState({
            status: "deploying",
            startedAt,
            deploymentPageUrl: pageUrl,
          });
        },
      });
      if (result.status === "deployed") {
        setState({
          status: "deployed",
          mcpServerUrl: result.mcpServerUrl,
          deploymentPageUrl: result.deploymentPageUrl,
        });
      } else {
        setState({
          status: "failed",
          message: `Deployment ${result.status}.`,
          deploymentPageUrl: result.deploymentPageUrl,
        });
      }
    } catch (err) {
      setState({
        status: "failed",
        message: errMessage(err, "Deployment failed"),
        deploymentPageUrl: pageUrl,
      });
    }
  };

  router.get("/__skybridge/deploy/status", async (_req, res) => {
    try {
      const whoami = await alpic.whoami();
      if (whoami.method === "unauthenticated") {
        res.json({ state: "signedOut" });
        return;
      }

      const loaded = alpic.projects.loadConfig();
      const cfg = loaded && (await alpic.projects.validateLink(loaded));
      const staleConfig = loaded !== null && cfg === null;
      if (!cfg) {
        const teams = await alpic.api.teams.list.v1();
        const team = teams[0];
        if (!team) {
          res.json({ state: "noTeam" });
          return;
        }
        res.json({
          state: "needsProject",
          teams,
          defaultTeamId: team.id,
          staleConfig,
        });
        return;
      }

      let lastDeployGit: {
        ref: string | null;
        commitMessage: string | null;
        author: string | null;
      } | null = null;
      let lastDeployStatus: DeploymentStatus | undefined;
      let lastDeployStartedAt: number | undefined;
      let mcpServerUrl: string | undefined;
      let deploymentPageUrl: string | null = null;
      if (cfg.environmentId) {
        try {
          const latest = await alpic.deployments.getLatestForEnvironment(
            cfg.environmentId,
          );
          if (latest.sourceCommitId !== null) {
            lastDeployGit = {
              ref: latest.sourceRef,
              commitMessage: latest.sourceCommitMessage,
              author: latest.authorUsername,
            };
          }
          lastDeployStatus = latest.status;
          lastDeployStartedAt = latest.startedAt?.getTime();
          deploymentPageUrl = latest.deploymentPageUrl;
          if (latest.status === "deployed") {
            const environment = await alpic.api.environments.get.v1({
              environmentId: cfg.environmentId,
            });
            mcpServerUrl = environment.mcpServerUrl;
          }
        } catch {
          // no deployments yet — leave defaults
        }
      }

      res.json({
        state: "ready",
        lastDeployGit,
        lastDeployStatus,
        lastDeployStartedAt,
        mcpServerUrl,
        deploymentPageUrl,
      });
    } catch (err) {
      res.status(502).json({
        state: "error",
        message: errMessage(err, "Alpic API unavailable"),
      });
    }
  });

  router.post("/__skybridge/deploy/project", async (req, res) => {
    if (state.status === "deploying") {
      res.status(409).json({ message: "A deployment is already in progress." });
      return;
    }
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const teamId = typeof req.body?.teamId === "string" ? req.body.teamId : "";
    const teamName =
      typeof req.body?.teamName === "string" ? req.body.teamName : undefined;
    if (!name || !teamId) {
      res.status(400).json({ message: "name and teamId are required." });
      return;
    }
    try {
      const existing = await alpic.api.projects.list.v1({ teamId });
      if (existing.some((p) => p.name === name)) {
        res
          .status(409)
          .json({ message: `A project named "${name}" already exists.` });
        return;
      }

      const cfg = await alpic.projects.createLinked({
        name,
        teamId,
        teamName,
        runtime: alpic.projects.detectRuntime() ?? "node24",
      });
      res.status(202).json({ ok: true });
      void runDeploy(cfg.environmentId, cfg.teamId);
    } catch (err) {
      res.status(502).json({
        message: errMessage(err, "Failed to create project"),
      });
    }
  });

  router.post("/__skybridge/deploy/login", async (_req, res) => {
    try {
      await alpic.auth.login();
      res.json({ ok: true });
    } catch (err) {
      res.status(502).json({
        message: errMessage(err, "Sign-in failed"),
      });
    }
  });

  router.post("/__skybridge/deploy", (_req, res) => {
    if (state.status === "deploying") {
      res.status(409).json({ message: "A deployment is already in progress." });
      return;
    }
    const cfg = alpic.projects.loadConfig();
    if (!cfg?.environmentId) {
      res.status(409).json({ message: "No linked project to redeploy." });
      return;
    }
    res.status(202).json({ ok: true });
    void runDeploy(cfg.environmentId, cfg.teamId);
  });

  router.get("/__skybridge/deploy/events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
    write(res, state);
    subscribers.add(res);
    req.on("close", () => {
      subscribers.delete(res);
    });
  });

  return router;
}
