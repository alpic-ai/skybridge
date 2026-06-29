import { generateHelpers } from "skybridge/web";
import type { AppType } from "./server.js";

export const { useToolInfo } = generateHelpers<AppType>();
