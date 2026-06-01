import { rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Command } from "@oclif/core";
import { Box, render, Text } from "ink";
import { useEffect } from "react";
import {
  emitEntryWrapper,
  emitManifestModule,
  emitVercelBuildOutput,
} from "../cli/build-helpers.js";
import { Header } from "../cli/header.js";
import { resolveViewsDir } from "../cli/resolve-views-dir.js";
import { type CommandStep, useExecuteSteps } from "../cli/use-execute-steps.js";
import { scanAndWriteViewsDts } from "../web/plugin/scan-views.js";

export const commandSteps: CommandStep[] = [
  {
    label: "Scanning views",
    run: async () => {
      const root = process.cwd();
      const viewsDir = await resolveViewsDir(root);
      scanAndWriteViewsDts(root, viewsDir);
    },
  },
  {
    label: "Compiling server",
    run: () => rmSync("dist", { recursive: true, force: true }),
    command: "tsc -b --force",
  },
  {
    label: "Building views",
    command: "vite build",
  },
  {
    label: "Emitting manifest module",
    // Inline the Vite manifest as a JS module so the wrapper can `import` it
    // instead of `readFileSync(process.cwd() + ...)` at runtime — required for
    // workerd, where neither cwd nor the assets directory is readable.
    run: () => {
      const root = process.cwd();
      emitManifestModule(
        path.join(root, "dist", "assets", ".vite", "manifest.json"),
        path.join(root, "dist", "vite-manifest.js"),
      );
    },
  },
  {
    label: "Emitting entry wrapper",
    // dist/__entry.js primes the Vite manifest via __setBuildManifest, then
    // dynamically imports user code. Deploy targets (Cloudflare, Vercel)
    // bundle from here so the manifest is available at runtime.
    run: () => {
      emitEntryWrapper(path.join(process.cwd(), "dist"));
    },
  },
  {
    label: "Emitting Cloudflare redirects",
    run: () => {
      const root = process.cwd();
      writeFileSync(
        path.join(root, "dist", "assets", "_redirects"),
        "/assets/assets/* /assets/:splat 200\n",
      );
    },
  },
  {
    label: "Emitting Cloudflare headers",
    run: () => {
      const root = process.cwd();
      writeFileSync(
        path.join(root, "dist", "assets", "_headers"),
        "/assets/*\n  Access-Control-Allow-Origin: *\n",
      );
    },
  },
  {
    label: "Emitting Vercel build output",
    run: () => emitVercelBuildOutput(process.cwd()),
  },
];

export default class Build extends Command {
  static override description = "Build the views and MCP server";
  static override examples = ["skybridge build"];

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
