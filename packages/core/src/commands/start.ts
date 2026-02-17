import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { Command } from "@oclif/core";
import { runCommand } from "../cli/run-command.js";

export default class Start extends Command {
  static override description = "Start production server";
  static override examples = ["skybridge start"];
  static override flags = {};

  public async run(): Promise<void> {
    console.clear();

    const candidates = [
      resolve(process.cwd(), "dist/server/src/index.js"),
      resolve(process.cwd(), "dist/index.js"),
    ];

    if (!candidates.some(existsSync)) {
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
      `Server running at: \x1b[32m\x1b[1mhttp://localhost:3000/mcp\x1b[0m`,
    );

    await runCommand(`node ${candidates.find(existsSync)}`, {
      stdio: ["ignore", "inherit", "inherit"],
      env: { ...process.env, NODE_ENV: "production" },
    });
  }
}
