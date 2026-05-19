import { Command } from "@oclif/core";
import spawn from "cross-spawn";

export default class Create extends Command {
  static override description = "Create a new Skybridge project";
  static override examples = [
    "skybridge create",
    "skybridge create my-app",
    "skybridge create my-app --overwrite",
  ];
  static override strict = false;

  public async run(): Promise<void> {
    const { status, error } = spawn.sync(
      "npx",
      ["--yes", "create-skybridge@latest", ...this.argv],
      { stdio: "inherit" },
    );

    if (error) {
      this.error(error);
    }

    process.exit(status ?? 1);
  }
}
