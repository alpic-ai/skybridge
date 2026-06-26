import { generateHelpers } from "skybridge/web";
import type { AppType } from "./server.js";

/**
 * Typed Skybridge hooks bound to this server's tool registry. The conformance
 * checks mostly use the untyped hooks from `skybridge/web` (they call many
 * tools dynamically), but the `tool-info` / `call-tool` categories exercise
 * these typed helpers to assert end-to-end inference works.
 */
export const { useToolInfo, useCallTool } = generateHelpers<AppType>();
