import { Command } from "@oclif/core";
import { Box, render, Text } from "ink";
import { useEffect } from "react";
import { Header } from "../cli/header.js";
import { type CommandStep, useExecuteSteps } from "../cli/use-execute-steps.js";

export const commandSteps: CommandStep[] = [
  {
    label: "Building widgets",
    command: "vite build -c web/vite.config.ts",
  },
  {
    label: "Cleaning dist folder",
    command: `node -e "require('fs').rmSync('dist', {recursive: true, force: true})"`,
  },
  {
    label: "Compiling server",
    command: "tsc -p tsconfig.server.json",
  },
  {
    label: "Copying static assets",
    command: `node -e "require('fs').cpSync('web/dist', 'dist/assets', {recursive: true})"`
  },
];

export default class Build extends Command {
  static override description = "Build the widgets and MCP server";
  static override examples = ["skybridge build"];
  static override flags = {};

  public async run(): Promise<void> {
    const App = () => {
      const { currentStep, status, error, execute } =
        useExecuteSteps(commandSteps);

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
