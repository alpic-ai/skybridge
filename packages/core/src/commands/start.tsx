import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { Command } from "@oclif/core";
import { Box, render, Text } from "ink";
import { Header } from "../cli/header.js";
import { runCommand } from "../cli/run-command.js";

export default class Start extends Command {
  static override description = "Start production server";
  static override examples = ["skybridge start"];
  static override flags = {};

  public async run(): Promise<void> {
    console.clear();

    const distPath = resolve(process.cwd(), "dist/index.js");
    if (!existsSync(distPath)) {
      console.error("❌ Error: dist/index.js not found");
      console.error("");
      console.error("Please build your project first:");
      console.error("  skybridge build");
      console.error("");
      process.exit(1);
    }

    runCommand("node dist/index.js", {
      stdio: ["ignore", "ignore", "inherit"],
      env: process.env,
    });

    const App = () => {
      return (
        <Box flexDirection="column" padding={1} marginLeft={1}>
          <Header version={this.config.version} />
          <Box>
            <Text>Server running at: </Text>
            <Text color="green" bold>
              http://localhost:3000/mcp
            </Text>
          </Box>
        </Box>
      );
    };

    render(<App />, { exitOnCtrlC: true, patchConsole: false });
  }
}
