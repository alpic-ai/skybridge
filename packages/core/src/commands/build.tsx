import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Command } from "@oclif/core";
import { Box, render, Text } from "ink";
import { useEffect } from "react";
import { Header } from "../cli/header.js";
import { type CommandStep, useExecuteSteps } from "../cli/use-execute-steps.js";
import { scanAndWriteViewsDts } from "../web/plugin/scan-views.js";

function hasWranglerConfig(): boolean {
  return ["wrangler.jsonc", "wrangler.toml", "wrangler.json"].some((f) =>
    existsSync(path.join(process.cwd(), f)),
  );
}

async function resolveViewsDir(root: string): Promise<string | undefined> {
  const { loadConfigFromFile } = await import("vite");
  const loaded = await loadConfigFromFile(
    { command: "build", mode: "production" },
    undefined,
    root,
  );

  const isPluginCandidate = (
    value: unknown,
  ): value is { name?: string; api?: { viewsDir?: string } } =>
    typeof value === "object" && value !== null;

  const plugins: Array<{ name?: string; api?: { viewsDir?: string } }> = [];
  const walk = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(walk);
    } else if (isPluginCandidate(value)) {
      plugins.push(value);
    }
  };
  walk(loaded?.config.plugins ?? []);
  return plugins.find((p) => p.name === "skybridge")?.api?.viewsDir;
}

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
    // Inline the Vite manifest as a JS module so the server can `import` it
    // instead of `readFileSync(process.cwd() + ...)` at runtime — required for
    // workerd, where neither cwd nor the assets directory is readable.
    // The path mirrors `skybridge start`'s entry convention (dist/server.js)
    // so the import in the user's entry resolves to a sibling file.
    run: () => {
      const root = process.cwd();
      const manifest = readFileSync(
        path.join(root, "dist", "assets", ".vite", "manifest.json"),
        "utf-8",
      );
      writeFileSync(
        path.join(root, "dist", "vite-manifest.js"),
        `export default ${manifest};\n`,
      );
    },
  },
  ...(hasWranglerConfig()
    ? [
        {
          label: "Emitting Cloudflare redirects",
          // Cloudflare's `assets.directory` maps URL → file literally — no
          // mount-strip like `app.use("/assets", express.static(...))`. Rewrite
          // `/assets/assets/*` to `/assets/*` before lookup; status 200 =
          // server-side rewrite, not HTTP redirect.
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
          // Cloudflare's static asset handler bypasses the worker entirely, so
          // `app.use("/assets", cors())` never fires for asset requests. Attach
          // CORS at the edge so cross-origin view iframes can load JS/CSS.
          run: () => {
            const root = process.cwd();
            writeFileSync(
              path.join(root, "dist", "assets", "_headers"),
              "/assets/*\n  Access-Control-Allow-Origin: *\n",
            );
          },
        },
      ]
    : []),
];

export default class Build extends Command {
  static override description = "Build the views and MCP server";
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
