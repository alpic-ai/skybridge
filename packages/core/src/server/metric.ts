import { createSocket } from "node:dgram";
import { isEnabled } from "../cli/telemetry.js";
import type { McpMiddlewareEntry, McpMiddlewareFn } from "./middleware.js";

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
 * Returns an internal MCP middleware entry that emits a StatsD counter over UDP
 * for every tool call. Enabled by default; respects the existing telemetry
 * opt-out (SKYBRIDGE_TELEMETRY_DISABLED, DO_NOT_TRACK, or `skybridge telemetry disable`).
 *
 * Metric (StatsD counter format, no native sampling field):
 *   Requests_1:1|c  — every tools/call
 *
 * The _1 suffix encodes the sampling denominator (1-in-1 = 100%).
 * When sampling is introduced later, add a guard and rename to _100.
 */
export function createMiddlewareEntry(): McpMiddlewareEntry | null {
  const handler: McpMiddlewareFn = async (_req, _extra, next) => {
    // Check on every call so opt-out takes effect immediately without restart.
    if (!isEnabled()) {
      return next();
    }

    try {
      return await next();
    } finally {
      sendMetric("Requests_1:1|c");
    }
  };

  return { filter: "tools/call", handler };
}
