import {
  cpSync,
  existsSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "@oclif/core";
import { Box, render, Text } from "ink";
import { useEffect } from "react";
import { Header } from "../cli/header.js";
import { type CommandStep, useExecuteSteps } from "../cli/use-execute-steps.js";

export const commandSteps: CommandStep[] = [
  {
    label: "Preparing build environment",
    run: () => {
      const projectRoot = process.cwd();
      const serverSrcDir = resolve(projectRoot, "server/src");
      const serverTsPath = join(serverSrcDir, "server.ts");

      if (!existsSync(serverTsPath)) {
        throw new Error(
          `server.ts not found at ${serverTsPath}. Please ensure your server.ts file exists in server/src/`,
        );
      }

      const indexTsPath = join(serverSrcDir, "index.ts");
      if (existsSync(indexTsPath)) {
        throw new Error(
          `There should be no index.ts file in server/src. Please remove it before building.`,
        );
      }

      const serverEntryPath = resolve(
        fileURLToPath(import.meta.url),
        "../../cli/server-entry.js",
      );
      const buildEntryContent = readFileSync(serverEntryPath, "utf-8");
      writeFileSync(join(serverSrcDir, "index.ts"), buildEntryContent, "utf-8");
    },
  },
  {
    label: "Building widgets",
    command: "vite build -c web/vite.config.ts",
  },
  {
    label: "Compiling server",
    run: () => rmSync("dist", { recursive: true, force: true }),
    command: "tsc -p tsconfig.server.json",
  },
  {
    label: "Copying static assets",
    run: () => cpSync("web/dist", "dist/assets", { recursive: true }),
  },
];

const cleanup = () => {
  const projectRoot = process.cwd();
  const serverIndex = resolve(projectRoot, "server/src/index.ts");
  if (existsSync(serverIndex)) {
    rmSync(serverIndex);
  }
};

export default class Build extends Command {
  static override description = "Build the widgets and MCP server";
  static override examples = ["skybridge build"];
  static override flags = {};

  public async run(): Promise<void> {
    const App = () => {
      const { currentStep, status, error, execute } = useExecuteSteps(
        commandSteps,
        cleanup,
      );

      useEffect(() => {
        execute();
      }, [execute]);

      return (
        <Box flexDirection="column" padding={1}>
          <Header version={this.config.version}>
            <Text color="green"> → building for production…</Text>
          </Header>

          {commandSteps.map((step, index) => {
            const isCurrent = index === currentStep && status === "running";
            const isCompleted = index < currentStep || status === "success";
            const isError = status === "error" && index === currentStep;

            return (
              <Box key={step.label} marginBottom={0}>
                <Text color={isError ? "red" : isCompleted ? "green" : "grey"}>
                  {isError ? "✗" : isCompleted ? "✓" : isCurrent ? "⟳" : "○"}{" "}
                  {step.label}
                </Text>
              </Box>
            );
          })}

          {status === "success" && (
            <Box marginTop={1}>
              <Text color="green" bold>
                ✓ Build completed successfully!
              </Text>
            </Box>
          )}

          {status === "error" && error && (
            <Box marginTop={1} flexDirection="column">
              <Text color="red" bold>
                ✗ Build failed
              </Text>
              <Box marginTop={1} flexDirection="column">
                {error.split("\n").map((line) => (
                  <Text key={line} color="red">
                    {line}
                  </Text>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      );
    };

    render(<App />, {
      exitOnCtrlC: true,
      patchConsole: false,
    });
  }
}
