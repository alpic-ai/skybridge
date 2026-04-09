import { createSocket } from "node:dgram";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { isEnabled } from "../cli/telemetry.js";
import type { McpMiddlewareEntry, McpMiddlewareFn } from "./middleware.js";

// TODO: replace with the actual Skybridge StatsD server address once provisioned
const STATSD_HOST = "TODO";
const STATSD_PORT = 8125;

let socket: ReturnType<typeof createSocket> | null = null;

function getSocket() {
  if (!socket) {
    socket = createSocket("udp4");
    socket.unref();
  }
  return socket;
}

function sendMetrics(metrics: string[]): void {
  const payload = Buffer.from(metrics.join("\n"));
  getSocket().send(payload, STATSD_PORT, STATSD_HOST, () => {
    // fire-and-forget: errors are intentionally silenced
  });
}

let isFirstInvocation = true;

/**
 * Returns an internal MCP middleware entry that emits StatsD counters over UDP
 * for every tool invocation. Enabled by default; respects the existing telemetry
 * opt-out (SKYBRIDGE_TELEMETRY_DISABLED, DO_NOT_TRACK, or `skybridge telemetry disable`).
 *
 * Metrics (StatsD counter format, no native sampling field):
 *   Invocations_1:1|c       — every tool call
 *   Errors_1:1|c            — tool returned isError:true or threw
 *   ColdInvocations_1:1|c   — first call since process start
 *
 * The _1 suffix encodes the sampling denominator (1-in-1 = 100%).
 * When sampling is introduced later, change the guard and rename to _100.
 */
export function createMonitoringEntry(): McpMiddlewareEntry | null {
  if (!isEnabled()) {
    return null;
  }

  const handler: McpMiddlewareFn = async (_req, _extra, next) => {
    const isCold = isFirstInvocation;
    isFirstInvocation = false;

    let isError = false;
    try {
      const result = await next();
      if ((result as CallToolResult).isError === true) {
        isError = true;
      }
      return result;
    } catch (err) {
      isError = true;
      throw err;
    } finally {
      const metrics = ["Invocations_1:1|c"];
      if (isError) {
        metrics.push("Errors_1:1|c");
      }
      if (isCold) {
        metrics.push("ColdInvocations_1:1|c");
      }
      sendMetrics(metrics);
    }
  };

  return { filter: "tools/call", handler };
}
