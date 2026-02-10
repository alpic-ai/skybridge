import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { Command, Flags } from "@oclif/core";
import { resolvePort } from "../cli/resolve-port.js";
import { runCommand } from "../cli/run-command.js";

/**
 * Production server command.
 */
export default class Start extends Command {
  static override description = "Start production server";
  static override examples = ["skybridge start"];
  static override flags = {
    port: Flags.integer({
      char: "p",
      description: "Port to run the production server on.",
      min: 0,
      max: 65535,
    }),
  };

  public async run(): Promise<void> {
    console.clear();
    const { flags } = await this.parse(Start);
    const port = resolvePort(flags.port, process.env.PORT, 3000);

    const distPath = resolve(process.cwd(), "dist/index.js");
    if (!existsSync(distPath)) {
      console.error("❌ Error: dist/index.js not found");
      console.error("");
      console.error("Please build your project first:");
      console.error("  skybridge build");
      console.error("");
      process.exit(1);
    }

    console.log(
      `\x1b[36m\x1b[1m⛰  Welcome to Skybridge\x1b[0m \x1b[36mv${this.config.version}\x1b[0m`,
    );
    console.log(
      `Server running at: \x1b[32m\x1b[1mhttp://localhost:${port}/mcp\x1b[0m`,
    );

    await runCommand("node dist/index.js", {
      stdio: ["ignore", "inherit", "inherit"],
      env: { ...process.env, NODE_ENV: "production", PORT: String(port) },
    });
  }
}
