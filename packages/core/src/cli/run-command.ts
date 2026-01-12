import { spawn } from "node:child_process";

export function runCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    const proc = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    if (proc.stdout) {
      proc.stdout.on("data", (chunk) => {
        stdoutChunks.push(chunk);
      });
    }

    if (proc.stderr) {
      proc.stderr.on("data", (chunk) => {
        stderrChunks.push(chunk);
      });
    }

    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        const stdoutOutput = Buffer.concat(stdoutChunks).toString();
        const stderrOutput = Buffer.concat(stderrChunks).toString();
        const allOutput = [stdoutOutput, stderrOutput]
          .filter((output) => output.trim())
          .join("\n");
        const errorMessage = allOutput
          ? `Command failed with exit code ${code}\n${allOutput}`
          : `Command failed with exit code ${code}`;
        reject(new Error(errorMessage));
      }
    });

    proc.on("error", (error) => {
      reject(error);
    });
  });
}
