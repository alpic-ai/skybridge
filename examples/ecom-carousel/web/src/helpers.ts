import { generateHelpers } from "skybridge/web";
import type { AppType } from "../../server/src/index";

export const { useToolInfo } = generateHelpers<AppType>();
