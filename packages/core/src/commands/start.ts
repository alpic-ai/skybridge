import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { Command, Flags } from "@oclif/core";
import { resolvePort } from "../cli/detect-port.js";
import { runCommand } from "../cli/run-command.js";

export default class Start extends Command {
  static override description = "Start production server";
  static override examples = ["skybridge start"];
  static override flags = {
    port: Flags.integer({
      char: "p",
      description: "Port to run the server on",
      min: 1,
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(Start);
    const { port, fallback, envWarning } = await resolvePort(flags.port);
    if (envWarning) {
      this.warn(envWarning);
    }

    console.clear();

    const indexPath = resolve(process.cwd(), "dist/server.js");

    if (!existsSync(indexPath)) {
      console.error("❌ Error: No build output found");
      console.error("");
      console.error("Please build your project first:");
      console.error("  skybridge build");
      console.error("");
      process.exit(1);
    }

    console.log(
      `\x1b[36m\x1b[1m⛰ Skybridge\x1b[0m \x1b[36mv${this.config.version}\x1b[0m`,
    );
    if (fallback) {
      console.log(
        `\x1b[33m3000 in use, running on\x1b[0m \x1b[32mhttp://localhost:${port}/mcp\x1b[0m`,
      );
    } else {
      console.log(`Running on \x1b[32mhttp://localhost:${port}/mcp\x1b[0m`);
    }

    await runCommand(`node ${indexPath}`, {
      stdio: ["ignore", "inherit", "inherit"],
      env: {
        ...process.env,
        NODE_ENV: "production",
        __PORT: String(port),
      },
    });
  }
}
