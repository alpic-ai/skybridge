import { useCallback, useState } from "react";
import { runCommand } from "./run-command.js";

interface BuildStep {
  label: string;
  commands: Array<{ command: string; args: string[] }>;
}

export const buildSteps: BuildStep[] = [
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
      { command: "shx", args: ["cp", "-r", "web/dist", "dist/assets"] },
    ],
  },
];

export const useExecuteBuild = () => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [status, setStatus] = useState<"running" | "success" | "error">(
    "running",
  );
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
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
  }, []);

  return { currentStep, status, error, execute };
};
