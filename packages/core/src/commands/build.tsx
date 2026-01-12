import { Command } from "@oclif/core";
import { Box, render, Text } from "ink";
import { useEffect, useState } from "react";
import { runCommand } from "../cli/run-command.js";
import { getPackageVersion } from "../cli/use-version.js";

interface BuildStep {
  label: string;
  commands: Array<{ command: string; args: string[] }>;
}

const buildSteps: BuildStep[] = [
  {
    label: "Building widgets",
    commands: [
      { command: "vite", args: ["build", "-c", "web/vite.config.ts"] },
    ],
  },
  {
    label: "Compiling server",
    commands: [
      { command: "shx", args: ["rm", "-rf", "server/dist"] },
      { command: "tsc", args: ["-p", "tsconfig.server.json"] },
    ],
  },
  {
    label: "Copying static assets",
    commands: [
      { command: "shx", args: ["cp", "-r", "web/dist", "server/dist/assets"] },
    ],
  },
];

export default class Build extends Command {
  static override description = "Build the widgets and MCP server";
  static override examples = ["skybridge build"];
  static override flags = {};
  static readonly packageVersion = getPackageVersion();

  public async run(): Promise<void> {
    const App = () => {
      const [currentStep, setCurrentStep] = useState<number>(0);
      const [status, setStatus] = useState<"running" | "success" | "error">(
        "running",
      );
      const [error, setError] = useState<string | null>(null);

      useEffect(() => {
        const executeBuild = async () => {
          try {
            for (let i = 0; i < buildSteps.length; i++) {
              const step = buildSteps[i];
              if (step) {
                setCurrentStep(i);
                for (const cmd of step.commands) {
                  await runCommand(cmd.command, cmd.args);
                }
              }
            }
            setStatus("success");
            // This ensures the success message is rendered before the process exits
            setTimeout(() => {
              process.exit(0);
            }, 500);
          } catch (err) {
            setStatus("error");
            setError(err instanceof Error ? err.message : String(err));
            // This ensures the error is rendered before the process exits
            setTimeout(() => {
              process.exit(1);
            }, 500);
          }
        };

        executeBuild();
      }, []);

      return (
        <Box flexDirection="column" padding={1}>
          <Box marginBottom={1}>
            <Text color="cyan" bold>
              ⛰{"  "}Skybridge
            </Text>
            <Text color="cyan"> v{Build.packageVersion}</Text>
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
