import { cpSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Command } from "@oclif/core";
import { Box, render, Text } from "ink";
import { useEffect, useMemo } from "react";
import {
  emitManifestModule,
  emitVercelFunction,
} from "../cli/build-helpers.js";
import { Header } from "../cli/header.js";
import { resolveViewsDir } from "../cli/resolve-views-dir.js";
import { type CommandStep, useExecuteSteps } from "../cli/use-execute-steps.js";
import { scanAndWriteViewsDts } from "../web/plugin/scan-views.js";

export function buildSteps(): CommandStep[] {
  return [
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
      run: () => {
        const root = process.cwd();
        emitManifestModule(
          path.join(root, "dist", "assets", ".vite", "manifest.json"),
          path.join(root, "dist", "vite-manifest.js"),
        );
      },
    },
    {
      label: "Copying assets to public/ for Vercel",
      run: () => {
        const root = process.cwd();
        const src = path.join(root, "dist", "assets");
        const dst = path.join(root, "public", "assets");
        rmSync(dst, { recursive: true, force: true });
        cpSync(src, dst, { recursive: true });
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
      label: "Emitting Vercel function",
      run: () => emitVercelFunction(process.cwd()),
    },
  ];
}

export const commandSteps: CommandStep[] = buildSteps();

export default class Build extends Command {
  static override description = "Build the views and MCP server";
  static override examples = ["skybridge build"];

  public async run(): Promise<void> {
    const App = () => {
      const steps = useMemo(() => buildSteps(), []);
      const { currentStep, status, error, execute } = useExecuteSteps(steps);

      useEffect(() => {
        execute();
      }, [execute]);

      return (
        <Box flexDirection="column" padding={1}>
          <Header version={this.config.version}>
            <Text color="green"> → building for production…</Text>
          </Header>

          {steps.map((step, index) => {
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
