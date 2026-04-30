import { Command } from "@oclif/core";
import { resolveViewsDir } from "../cli/resolve-views-dir.js";
import { scanAndWriteViewsDts } from "../web/plugin/scan-views.js";

export default class Typegen extends Command {
  static override description =
    "Generate .skybridge/views.d.ts from src/views without running a full build";
  static override examples = ["skybridge typegen"];
  static override flags = {};

  public async run(): Promise<void> {
    const root = process.cwd();
    const viewsDir = await resolveViewsDir(root);
    scanAndWriteViewsDts(root, viewsDir);
  }
}
