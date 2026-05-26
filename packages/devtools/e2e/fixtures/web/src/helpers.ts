import { generateHelpers } from "skybridge/web";
import type { AppType } from "../../server.ts";

export const { useToolInfo } = generateHelpers<AppType>();
