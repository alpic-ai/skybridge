import { rmSync } from "node:fs";
import { Command } from "@oclif/core";
import { Box, render, Text } from "ink";
import { useEffect } from "react";
import { Header } from "../cli/header.js";
import { type CommandStep, useExecuteSteps } from "../cli/use-execute-steps.js";
import { scanAndWriteWidgetsDts } from "../web/plugin/scan-widgets.js";

/**
 * `tsc -b` runs before `vite build`, so the pre-scan can't read the plugin's
 * runtime `widgetsDir`. Loading `vite.config.ts` here keeps `WidgetName`
 * narrowing correct for users with a custom widget dir.
 */
async function resolveWidgetsDir(root: string): Promise<string | undefined> {
  const { loadConfigFromFile } = await import("vite");
  const loaded = await loadConfigFromFile(
    { command: "build", mode: "production" },
    undefined,
    root,
  );
  const raw = (loaded?.config.plugins ?? []) as unknown as unknown[];
  const plugins: Array<{ name?: string; api?: { widgetsDir?: string } }> = [];
  const walk = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(walk);
    } else if (value && typeof value === "object") {
      plugins.push(value as never);
    }
  };
  walk(raw);
  return plugins.find((p) => p?.name === "skybridge")?.api?.widgetsDir;
}

export const commandSteps: CommandStep[] = [
  {
    label: "Scanning widgets",
    run: async () => {
      const root = process.cwd();
      const widgetsDir = await resolveWidgetsDir(root);
      scanAndWriteWidgetsDts(root, widgetsDir);
    },
  },
  {
    label: "Compiling server",
    run: () => rmSync("dist", { recursive: true, force: true }),
    command: "tsc -b",
  },
  {
    label: "Building widgets",
    command: "vite build",
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
