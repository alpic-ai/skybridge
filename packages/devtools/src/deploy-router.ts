import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  Alpic,
  type DeployEvent,
  type DeploymentStatus,
  type DeployResult,
} from "@alpic-ai/sdk";
import express, { type Router } from "express";

type ProjectConfig = {
  projectId: string;
  teamId: string;
  teamName?: string;
  projectName: string;
  environmentId?: string;
  environmentName?: string;
};

// `collecting`/`collected` share step 1, so there are 4 numbered steps.
const TOTAL_STEPS = 4;
const PHASE_STEPS: Record<
  DeployEvent["type"],
  { step: number; label: string }
> = {
  collecting: { step: 1, label: "Collecting files" },
  collected: { step: 1, label: "Collecting files" },
  uploading: { step: 2, label: "Uploading source" },
  triggering: { step: 3, label: "Triggering deployment" },
  deploying: { step: 4, label: "Deploying" },
};
const phaseText = (type: DeployEvent["type"]): string => {
  const { step, label } = PHASE_STEPS[type];
  return `${step}/${TOTAL_STEPS} ${label}`;
};

type DeployState =
  | { status: "idle" }
  | {
      status: "deploying";
      phase: string;
      // Epoch ms when this deploy started. Held in the (process-lived) server
      // state and replayed over SSE, so the client's elapsed clock survives
      // both hover remounts and page refreshes.
      startedAt: number;
      deploymentPageUrl: string | null;
    }
  | {
      status: "deployed";
      deploymentId: string;
      mcpServerUrl: string;
      deploymentPageUrl: string | null;
      domains: string[];
    }
  | { status: "failed"; message: string; deploymentPageUrl: string | null };

const configPath = () => join(process.cwd(), ".alpic", "project.json");

function loadConfig(): ProjectConfig | null {
  const path = configPath();
  if (!existsSync(path)) {
    return null;
  }
  return JSON.parse(readFileSync(path, "utf8")) as ProjectConfig;
}

function saveConfig(cfg: ProjectConfig): void {
  mkdirSync(join(process.cwd(), ".alpic"), { recursive: true });
  writeFileSync(configPath(), JSON.stringify(cfg, null, 2));
}

/**
 * Dev-only router that drives the devtools Deploy button. Runs `@alpic-ai/sdk`
 * in-process (no CLI spawning): `/status` is a plain request, deploy progress
 * streams over SSE at `/events`.
 *
 * ponytail: deploy state + subscriber set are per-router-instance (closure
 * scoped). The dev server mounts one router for one project, so a single
 * in-flight deploy is fine; no change needed unless it ever hosts several.
 */
export function createDeployRouter(alpicOverride?: Alpic): Router {
  const router = express.Router();
  // Lazy: `new Alpic()` reads server-side env at construction, so defer it to
  // the first request rather than mount time (keeps createApp test-safe).
  let alpicInstance = alpicOverride;
  const alpic = () => {
    alpicInstance ??= new Alpic();
    return alpicInstance;
  };

  let state: DeployState = { status: "idle" };
  let deployGeneration = 0;
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
    // Each deploy claims a generation; a newer deploy supersedes older ones so
    // a redeploy can ignore an in-flight deployment's late state updates.
    const generation = ++deployGeneration;
    const startedAt = Date.now();
    const apply = (s: DeployState) => {
      if (generation === deployGeneration) {
        setState(s);
      }
    };
    apply({
      status: "deploying",
      phase: phaseText("collecting"),
      startedAt,
      deploymentPageUrl: null,
    });
    let pageUrl: string | null = null;
    try {
      const result: DeployResult = await alpic().deployments.deploy({
        environmentId,
        teamId,
        onProgress: (event) => {
          if (event.type === "deploying" && event.deploymentPageUrl) {
            pageUrl = event.deploymentPageUrl;
          }
          apply({
            status: "deploying",
            phase: phaseText(event.type),
            startedAt,
            deploymentPageUrl: pageUrl,
          });
        },
      });
      if (result.status === "deployed") {
        apply({
          status: "deployed",
          deploymentId: result.deploymentId,
          mcpServerUrl: result.mcpServerUrl,
          deploymentPageUrl: result.deploymentPageUrl,
          domains: result.domains,
        });
      } else {
        apply({
          status: "failed",
          message: `Deployment ${result.status}.`,
          deploymentPageUrl: result.deploymentPageUrl,
        });
      }
    } catch (err) {
      apply({
        status: "failed",
        message: err instanceof Error ? err.message : "Deployment failed",
        deploymentPageUrl: pageUrl,
      });
    }
  };

  router.get("/__skybridge/deploy/status", async (_req, res) => {
    try {
      const whoami = await alpic().whoami();
      if (whoami.method === "unauthenticated") {
        res.json({ state: "signedOut" });
        return;
      }

      const teams = await alpic().api.teams.list.v1();
      const team = teams[0];
      if (!team) {
        res.json({ state: "noTeam" });
        return;
      }

      const cfg = loadConfig();
      if (!cfg) {
        res.json({ state: "needsProject", teams, defaultTeamId: team.id });
        return;
      }

      let project: Awaited<ReturnType<Alpic["api"]["projects"]["get"]["v1"]>>;
      try {
        project = await alpic().api.projects.get.v1({
          projectId: cfg.projectId,
        });
      } catch {
        // Stale config: linked project deleted/inaccessible — fall back to first deploy.
        res.json({
          state: "needsProject",
          teams,
          defaultTeamId: team.id,
          staleConfig: true,
        });
        return;
      }

      // Surface the live URL + deployment page so the persistent "Deployed"
      // view renders on load (not only after a fresh deploy). A git-driven
      // latest deploy (commit/author set) means the last deploy came from a
      // connected repo, not this local button — expose its details so the UI
      // can inform + warn before redeploying over it.
      // ponytail: git vs local is the only distinction the API exposes; CLI and
      // devtools local deploys are indistinguishable.
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
          const latest = await alpic().deployments.getLatestForEnvironment(
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
            const environment = await alpic().api.environments.get.v1({
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
        team,
        project: { id: project.id, name: project.name },
        environmentId: cfg.environmentId,
        lastDeployGit,
        lastDeployStatus,
        lastDeployStartedAt,
        mcpServerUrl,
        deploymentPageUrl,
      });
    } catch (err) {
      res.status(502).json({
        state: "error",
        message: err instanceof Error ? err.message : "Alpic API unavailable",
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
    if (!name || !teamId) {
      res.status(400).json({ message: "name and teamId are required." });
      return;
    }
    try {
      const existing = await alpic().api.projects.list.v1({ teamId });
      if (existing.some((p) => p.name === name)) {
        res
          .status(409)
          .json({ message: `A project named "${name}" already exists.` });
        return;
      }

      const created = await alpic().api.projects.create.v1({
        name,
        teamId,
        runtime: "node24",
      });
      const productionEnv = created.productionEnvironment;
      if (!productionEnv) {
        res.status(500).json({
          message: "Project created without a Production environment.",
        });
        return;
      }
      const team = (await alpic().api.teams.list.v1()).find(
        (t) => t.id === teamId,
      );
      saveConfig({
        projectId: created.id,
        teamId: created.teamId,
        teamName: team?.name,
        projectName: created.name,
        environmentId: productionEnv.id,
        environmentName: productionEnv.name,
      });
      res.status(202).json({ ok: true });
      void runDeploy(productionEnv.id, created.teamId);
    } catch (err) {
      res.status(502).json({
        message:
          err instanceof Error ? err.message : "Failed to create project",
      });
    }
  });

  router.post("/__skybridge/deploy/login", async (_req, res) => {
    try {
      await alpic().auth.login();
      res.json({ ok: true });
    } catch (err) {
      res.status(502).json({
        message: err instanceof Error ? err.message : "Sign-in failed",
      });
    }
  });

  router.post("/__skybridge/deploy", (_req, res) => {
    // No in-progress guard: a redeploy intentionally supersedes any running
    // deployment (runDeploy's generation guard drops the old one's updates).
    const cfg = loadConfig();
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
