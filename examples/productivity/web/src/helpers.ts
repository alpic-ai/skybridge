import { generateHelpers } from "skybridge/web";
import type { AppType } from "../../server/src/server";

export const { useToolInfo, useCallTool } = generateHelpers<AppType>();

export type ToolInfo = ReturnType<typeof useToolInfo<"productivity">>;
export type Output = NonNullable<ToolInfo["output"]>;
export type Day = Output["days"][number];
export type Activity = Day["activities"][number];
