import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { Command, Flags } from "@oclif/core";
import { detectAvailablePort } from "../cli/detect-port.js";
import { runCommand } from "../cli/run-command.js";

export default class Start extends Command {
  static override description = "Start production server";
  static override examples = ["skybridge start"];
  static override flags = {
    port: Flags.integer({
      char: "p",
      description: "Port to run the server on",
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(Start);
    const DEFAULT_PORT = 3000;
    const port = flags.port ?? (await detectAvailablePort(DEFAULT_PORT));

    console.clear();

    const candidates = [
      resolve(process.cwd(), "dist/server/src/index.js"),
      resolve(process.cwd(), "dist/index.js"),
    ];

    const indexPath = candidates.find(existsSync);

    if (!indexPath) {
      console.error("❌ Error: No build output found");
      console.error("");
      console.error("Please build your project first:");
      console.error("  skybridge build");
      console.error("");
      process.exit(1);
      return;
    }

    console.log(
      `\x1b[36m\x1b[1m⛰  Welcome to Skybridge\x1b[0m \x1b[36mv${this.config.version}\x1b[0m`,
    );
    if (!flags.port && port !== DEFAULT_PORT) {
      console.log(
        `\x1b[33mPort ${DEFAULT_PORT} is in use, falling back to port ${port}\x1b[0m`,
      );
    }
    console.log(
      `Server running at: \x1b[32m\x1b[1mhttp://localhost:${port}/mcp\x1b[0m`,
    );

    await runCommand(`node ${indexPath}`, {
      stdio: ["ignore", "inherit", "inherit"],
      env: {
        ...process.env,
        NODE_ENV: "production",
        SKYBRIDGE_PORT: String(port),
      },
    });
  }
}
