import type { ToolOutput } from "skybridge/server";
import { generateHelpers } from "skybridge/web";
import type { AppType } from "../../server/src/index.js";

export const { useToolInfo, useCallTool } = generateHelpers<AppType>();

export type Output = ToolOutput<AppType, "show-productivity-insights">;
export type Day = Output["days"][number];
export type Activity = Day["activities"][number];
