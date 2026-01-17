import { generateHelpers } from "skybridge/web";
import type { AppType } from "../../server/src/server.js";

export const { useCallTool, useToolInfo } = generateHelpers<AppType>();
