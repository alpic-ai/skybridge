import { useEffect } from "react";
import { z } from "zod";
import { create } from "zustand";

const teamSchema = z.object({ id: z.string(), name: z.string() });

const statusSchema = z.discriminatedUnion("state", [
  z.object({ state: z.literal("signedOut") }),
  z.object({ state: z.literal("noTeam") }),
  z.object({
    state: z.literal("needsProject"),
    teams: z.array(teamSchema),
    defaultTeamId: z.string(),
    staleConfig: z.boolean().optional(),
  }),
  z.object({
    state: z.literal("ready"),
    lastDeployGit: z
      .object({
        ref: z.string().nullable(),
        commitMessage: z.string().nullable(),
        author: z.string().nullable(),
      })
      .nullable()
      .optional(),
    lastDeployStatus: z
      .enum(["ongoing", "deployed", "failed", "canceled"])
      .optional(),
    lastDeployStartedAt: z.number().optional(),
    mcpServerUrl: z.string().optional(),
    deploymentPageUrl: z.string().nullable().optional(),
  }),
  z.object({ state: z.literal("error"), message: z.string() }),
]);

export type DeployStatus = { state: "loading" } | z.infer<typeof statusSchema>;

const progressSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("idle") }),
  z.object({
    status: z.literal("deploying"),
    phase: z.string(),
    startedAt: z.number(),
    deploymentPageUrl: z.string().nullable(),
  }),
  z.object({
    status: z.literal("deployed"),
    mcpServerUrl: z.string(),
    deploymentPageUrl: z.string().nullable(),
  }),
  z.object({
    status: z.literal("failed"),
    message: z.string(),
    deploymentPageUrl: z.string().nullable(),
  }),
]);

export type DeployProgress = z.infer<typeof progressSchema>;

type DeployStore = {
  status: DeployStatus;
  progress: DeployProgress;
  refreshStatus: () => Promise<void>;
  signIn: () => Promise<void>;
  createAndDeploy: (
    name: string,
    teamId: string,
    teamName?: string,
  ) => Promise<void>;
  redeploy: () => Promise<void>;
  connect: () => () => void;
};

const DEPLOY_PATH = "/__skybridge/deploy";

async function postJson(
  path: string,
  body?: unknown,
  fallback = "Request failed",
): Promise<void> {
  const res = await fetch(path, {
    method: "POST",
    ...(body !== undefined && {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  });
  if (!res.ok) {
    const { message } = (await res.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new Error(message ?? `${fallback} (${res.status})`);
  }
}

const optimisticDeploying = (): DeployProgress => ({
  status: "deploying",
  phase: "Preparing deployment",
  startedAt: Date.now(),
  deploymentPageUrl: null,
});

export const useDeployStore = create<DeployStore>()((set, get) => ({
  status: { state: "loading" },
  progress: { status: "idle" },

  async refreshStatus() {
    try {
      const res = await fetch(`${DEPLOY_PATH}/status`);
      const parsed = statusSchema.safeParse(await res.json());
      set({
        status: parsed.success
          ? parsed.data
          : { state: "error", message: "Unexpected status response" },
      });
    } catch (err) {
      set({
        status: {
          state: "error",
          message: err instanceof Error ? err.message : "Failed to load status",
        },
      });
    }
  },

  async signIn() {
    await postJson(`${DEPLOY_PATH}/login`, undefined, "Sign-in failed");
    await get().refreshStatus();
  },

  async createAndDeploy(name, teamId, teamName) {
    set({ progress: optimisticDeploying() });
    try {
      await postJson(
        `${DEPLOY_PATH}/project`,
        { name, teamId, teamName },
        "Failed to create project",
      );
    } catch (err) {
      set({ progress: { status: "idle" } });
      throw err;
    }
  },

  async redeploy() {
    set({ progress: optimisticDeploying() });
    try {
      await postJson(DEPLOY_PATH, undefined, "Failed to deploy");
    } catch (err) {
      set({ progress: { status: "idle" } });
      throw err;
    }
  },

  connect() {
    const source = new EventSource(`${DEPLOY_PATH}/events`);

    source.addEventListener("state", (event) => {
      try {
        const parsed = progressSchema.safeParse(
          JSON.parse((event as MessageEvent).data),
        );
        if (parsed.success) {
          const prev = get().progress.status;
          set({ progress: parsed.data });
          // A finished deploy writes .alpic/project.json — refresh so a first
          // deploy flips needsProject → ready.
          if (parsed.data.status === "deployed" && prev !== "deployed") {
            void get().refreshStatus();
          }
        }
      } catch {
        // ignore malformed frame
      }
    });

    return () => {
      source.close();
    };
  },
}));

export function useConnectDeploy() {
  const connect = useDeployStore((s) => s.connect);
  const refreshStatus = useDeployStore((s) => s.refreshStatus);
  // SSE only streams this session's deploy — poll while ongoing so a deploy
  // finishing out-of-session (git, CLI) still reaches its terminal state.
  const ongoing = useDeployStore(
    (s) =>
      s.status.state === "ready" && s.status.lastDeployStatus === "ongoing",
  );
  useEffect(() => {
    void refreshStatus();
    return connect();
  }, [connect, refreshStatus]);
  useEffect(() => {
    if (!ongoing) {
      return;
    }
    const id = setInterval(() => void refreshStatus(), 4000);
    return () => clearInterval(id);
  }, [ongoing, refreshStatus]);
}
