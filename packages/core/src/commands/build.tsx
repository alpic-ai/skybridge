import { Command } from "@oclif/core";
import { Box, render, Text } from "ink";
import { useEffect } from "react";
import { buildSteps, useExecuteBuild } from "../cli/use-execute-build.js";

export default class Build extends Command {
  static override description = "Build the widgets and MCP server";
  static override examples = ["skybridge build"];
  static override flags = {};

  public async run(): Promise<void> {
    const App = () => {
      const { currentStep, status, error, execute } = useExecuteBuild();

      useEffect(() => {
        execute();
      }, [execute]);

      return (
        <Box flexDirection="column" padding={1}>
          <Box marginBottom={1}>
            <Text color="cyan" bold>
              ⛰{"  "}Skybridge
            </Text>
            <Text color="cyan"> v{this.config.version}</Text>
            <Text color="green"> → building for production…</Text>
          </Box>

          {buildSteps.map((step, index) => {
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
