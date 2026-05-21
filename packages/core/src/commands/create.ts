import { Command, type Command as CommandLoadable, Help } from "@oclif/core";
import spawn from "cross-spawn";

function passthrough(args: string[]): never {
  const { status, error } = spawn.sync(
    "npx",
    ["--yes", "create-skybridge@latest", ...args],
    { stdio: "inherit" },
  );
  if (error) {
    console.error(error);
    process.exit(1);
  }
  process.exit(status ?? 1);
}

export default class Create extends Command {
  static override description = "Scaffold a new Skybridge project";
  static override strict = false;

  public async run(): Promise<void> {
    passthrough(this.argv);
  }
}

// Registered as `oclif.helpClass` so that `skybridge create --help` forwards
// to `create-skybridge --help` (single source of truth for the help text)
// instead of rendering oclif's auto-generated help. All other commands fall
// through to the default `Help` behaviour.
export class SkybridgeHelp extends Help {
  override async showCommandHelp(
    command: CommandLoadable.Loadable,
  ): Promise<void> {
    if (command.id === "create") {
      passthrough(["--help"]);
    }
    return super.showCommandHelp(command);
  }
}
