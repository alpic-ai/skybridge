import { createSocket } from "node:dgram";
import { isEnabled } from "../cli/telemetry.js";
import { VERSION } from "../version.js";
import type { McpMiddlewareEntry, McpMiddlewareFn } from "./middleware.js";

function parseMajorMinor(version: string): string | null {
  const parts = version.split(".");
  if (parts.length < 2) {
    return null;
  }
  return `${parts[0]}.${parts[1]}`;
}

const isDev = VERSION.includes("-dev");
const versionTag = parseMajorMinor(VERSION);

const STATSD_HOST = "18.208.242.161";
const STATSD_PORT = 8125;

let socket: ReturnType<typeof createSocket> | null = null;

function getSocket() {
  if (!socket) {
    socket = createSocket("udp4");
    socket.unref();
  }
  return socket;
}

function sendMetric(metric: string): void {
  if (!STATSD_HOST) {
    return;
  }
  const payload = Buffer.from(metric);
  getSocket().send(payload, STATSD_PORT, STATSD_HOST, () => {
    // fire-and-forget: errors are intentionally silenced
  });
}

/**
 * Returns an internal MCP middleware entry that emits a DogStatsD counter over UDP
 * for every tool call. Enabled by default; respects the existing telemetry
 * opt-out (SKYBRIDGE_TELEMETRY_DISABLED, DO_NOT_TRACK, or `skybridge telemetry disable`).
 *
 * Returns `null` when the version string contains "-dev" (e.g. development
 * builds) or when the version cannot be parsed into major.minor, so that
 * malformed data does not pollute production metrics.
 *
 * Metric (DogStatsD counter format with tags):
 *   Requests:1|c|#version:<major>.<minor>  — every tools/call
 */
export function createMiddlewareEntry(): McpMiddlewareEntry | null {
  if (isDev || !versionTag) {
    return null;
  }

  const handler: McpMiddlewareFn = async (_req, _extra, next) => {
    // Check on every call so opt-out takes effect immediately without restart.
    if (!isEnabled()) {
      return next();
    }

    try {
      return await next();
    } finally {
      sendMetric(`Requests:1|c|#version:${versionTag}`);
    }
  };

  return { filter: "tools/call", handler };
}
