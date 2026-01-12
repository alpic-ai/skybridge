import { useCallback, useState } from "react";
import { runCommand } from "./run-command.js";

export interface CommandStep {
  label: string;
  command: string;
}

export const useExecuteSteps = (steps: CommandStep[]) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [status, setStatus] = useState<"running" | "success" | "error">(
    "running",
  );
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    try {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (step) {
          setCurrentStep(i);
          const [command, ...args] = step.command.split(" ");
          if (!command) {
            throw new Error("Invalid command");
          }
          await runCommand(command, args);
        }
      }
      setStatus("success");
      setImmediate(() => {
        process.exit(0);
      });
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : String(err));
      setImmediate(() => {
        process.exit(1);
      });
    }
  }, [steps]);

  return { currentStep, status, error, execute };
};
