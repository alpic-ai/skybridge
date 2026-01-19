import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Hook } from "@oclif/core";
import ci from "ci-info";
import { PostHog } from "posthog-node";

const POSTHOG_API_KEY = "phc_rQdkCYr0DO4NcZBQXZnUwsHAbau9zuNwKIpil9FQP6v";
const POSTHOG_HOST = "https://us.i.posthog.com";

const ENV_TELEMETRY_DISABLED = "SKYBRIDGE_TELEMETRY_DISABLED";
const ENV_TELEMETRY_DEBUG = "SKYBRIDGE_TELEMETRY_DEBUG";
const ENV_DO_NOT_TRACK = "DO_NOT_TRACK";

const GLOBAL_CONFIG_DIR = join(homedir(), ".skybridge");
const GLOBAL_CONFIG_FILE = join(GLOBAL_CONFIG_DIR, "config.json");

interface GlobalConfig {
  machineId: string;
  telemetry: {
    enabled: boolean;
  };
}

interface TelemetryEvent {
  version: string;
  machineId: string;
  sessionId: string;
  isCI: boolean;
  nodeVersion: string;
  platform: NodeJS.Platform;
  outcome: "success" | "failure";
  error?: string;
}

let posthogClient: PostHog | null = null;

function getPostHogClient(): PostHog {
  if (!posthogClient) {
    posthogClient = new PostHog(POSTHOG_API_KEY, {
      host: POSTHOG_HOST,
      flushAt: 1,
      flushInterval: 0,
    });
  }

  return posthogClient;
}

function readJsonFile<T>(filePath: string): T | null {
  try {
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, "utf-8");
      return JSON.parse(content) as T;
    }
  } catch {
    // Ignore errors reading config
  }
  return null;
}

function writeJsonFile(filePath: string, data: unknown): void {
  try {
    const dir = join(filePath, "..");
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch {
    // Ignore errors writing config
  }
}

function getGlobalConfig(): GlobalConfig {
  const existing = readJsonFile<GlobalConfig>(GLOBAL_CONFIG_FILE);
  if (existing?.machineId && existing?.telemetry !== undefined) {
    return existing;
  }

  const config: GlobalConfig = {
    machineId: existing?.machineId || crypto.randomUUID(),
    telemetry: {
      enabled: existing?.telemetry?.enabled ?? true,
    },
  };

  writeJsonFile(GLOBAL_CONFIG_FILE, config);
  return config;
}

export function isEnabled(): boolean {
  if (
    process.env[ENV_TELEMETRY_DISABLED] === "1" ||
    process.env[ENV_TELEMETRY_DISABLED]?.toLowerCase() === "true"
  ) {
    return false;
  }

  if (
    process.env[ENV_DO_NOT_TRACK] === "1" ||
    process.env[ENV_DO_NOT_TRACK]?.toLowerCase() === "true"
  ) {
    return false;
  }

  if (ci.isCI) {
    return true;
  }

  const config = getGlobalConfig();
  return config.telemetry.enabled;
}

export function isDebugMode(): boolean {
  return (
    process.env[ENV_TELEMETRY_DEBUG] === "1" ||
    process.env[ENV_TELEMETRY_DEBUG]?.toLowerCase() === "true"
  );
}

export function setEnabled(enabled: boolean): void {
  const config = getGlobalConfig();
  config.telemetry.enabled = enabled;
  writeJsonFile(GLOBAL_CONFIG_FILE, config);
}

export function getMachineId(): string {
  if (ci.isCI) {
    return ci.name ?? "unknown-ci";
  }

  return getGlobalConfig().machineId;
}

const hook: Hook<"finally"> = async ({
  id: command,
  config: { version },
  error,
}) => {
  if (!isEnabled()) {
    return;
  }

  const event: TelemetryEvent = {
    version,
    machineId: getMachineId(),
    sessionId: crypto.randomUUID(),
    isCI: ci.isCI,
    nodeVersion: process.version,
    platform: process.platform,
    outcome: error ? "failure" : "success",
    error: error?.message,
  };

  if (isDebugMode()) {
    console.error(
      "[Telemetry Debug] Would send event:",
      JSON.stringify(event, null, 2),
    );
    return;
  }

  try {
    const client = getPostHogClient();
    client.capture({
      distinctId: event.machineId,
      event: command,
      properties: event,
    });
  } catch {
    // Silently ignore telemetry errors - never block CLI operation
  }
};

export default hook;
