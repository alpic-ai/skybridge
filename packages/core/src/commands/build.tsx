import { mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Command, Flags } from "@oclif/core";
import { Box, render, Text } from "ink";
import { useEffect, useMemo } from "react";
import { Header } from "../cli/header.js";
import { type CommandStep, useExecuteSteps } from "../cli/use-execute-steps.js";
import { scanAndWriteViewsDts } from "../web/plugin/scan-views.js";
import {
  emitManifestModule,
  emitVercelFunction,
  ensureVercelJson,
} from "./build-helpers.js";

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

export function buildSteps(
  target: "default" | "vercel",
  warnings: { current: string[] },
): CommandStep[] {
  const scanViews: CommandStep = {
    label: "Scanning views",
    run: async () => {
      const root = process.cwd();
      const viewsDir = await resolveViewsDir(root);
      scanAndWriteViewsDts(root, viewsDir);
    },
  };
  const compileServer: CommandStep = {
    label: "Compiling server",
    run: () => rmSync("dist", { recursive: true, force: true }),
    command: "tsc -b --force",
  };
  const buildViews: CommandStep = {
    label: "Building views",
    command: "vite build",
  };

  if (target === "vercel") {
    return [
      scanViews,
      compileServer,
      buildViews,
      {
        label: "Relocating assets to public/",
        // Vite plugin's config() locks outDir to dist/assets; move post-build
        // to satisfy Vercel's CDN filesystem-precedence routing.
        run: () => {
          const root = process.cwd();
          const src = path.join(root, "dist", "assets");
          const dst = path.join(root, "public", "assets");
          rmSync(dst, { recursive: true, force: true });
          mkdirSync(path.join(root, "public"), { recursive: true });
          renameSync(src, dst);
        },
      },
      {
        label: "Emitting manifest module",
        run: () => {
          const root = process.cwd();
          emitManifestModule(
            path.join(root, "public", "assets", ".vite", "manifest.json"),
            path.join(root, "dist", "vite-manifest.js"),
          );
        },
      },
      {
        label: "Emitting Vercel function",
        run: () => emitVercelFunction(process.cwd()),
      },
      {
        label: "Ensuring vercel.json",
        run: () => {
          const result = ensureVercelJson(process.cwd());
          warnings.current = result.warnings;
        },
      },
    ];
  }

  return [
    scanViews,
    compileServer,
    buildViews,
    {
      label: "Emitting manifest module",
      // Inline the Vite manifest as a JS module so the server can `import` it
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
  ];
}

export const commandSteps: CommandStep[] = buildSteps("default", {
  current: [],
});

export default class Build extends Command {
  static override description = "Build the views and MCP server";
  static override examples = [
    "skybridge build",
    "skybridge build --target vercel",
  ];
  static override flags = {
    target: Flags.string({
      description:
        "Deployment target. Omit for the default Cloudflare/Docker pipeline.",
      options: ["vercel"],
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(Build);
    const isVercel = flags.target === "vercel";

    const App = () => {
      const warnings = useMemo<{ current: string[] }>(
        () => ({ current: [] }),
        [],
      );
      const steps = useMemo(
        () => buildSteps(isVercel ? "vercel" : "default", warnings),
        [warnings],
      );
      const { currentStep, status, error, execute } = useExecuteSteps(steps);

      useEffect(() => {
        execute();
      }, [execute]);

      return (
        <Box flexDirection="column" padding={1}>
          <Header version={this.config.version}>
            <Text color="green">
              {" → building for production"}
              {isVercel ? " (vercel)" : ""}…
            </Text>
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
            <Box marginTop={1} flexDirection="column">
              <Text color="green" bold>
                ✓ Build completed successfully!
              </Text>
              {isVercel && warnings.current.length > 0 && (
                <Box marginTop={1} flexDirection="column">
                  <Text color="yellow" bold>
                    ⚠ vercel.json warnings:
                  </Text>
                  {warnings.current.map((line) => (
                    <Text key={line} color="yellow">
                      {" "}
                      • {line}
                    </Text>
                  ))}
                </Box>
              )}
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
