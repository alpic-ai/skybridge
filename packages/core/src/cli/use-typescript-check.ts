import { useEffect, useRef, useState } from "react";
import { spawn } from "child_process";
import { relative, isAbsolute } from "node:path";

type TsError = {
  file: string;
  line: number;
  col: number;
  message: string;
};

export function useTypeScriptCheck(): Array<TsError> {
  const tsProcessRef = useRef<ReturnType<typeof spawn> | null>(null);
  const [tsErrors, setTsErrors] = useState<Array<TsError>>([]);

  useEffect(() => {
    const tsProcess = spawn(
      "npx",
      ["tsc", "--noEmit", "--watch", "--pretty", "false"],
      {
        stdio: ["ignore", "pipe", "pipe"],
        shell: true,
      },
    );

    tsProcessRef.current = tsProcess;

    let outputBuffer = "";
    let currentErrors: Array<TsError> = [];

    const processOutput = (data: Buffer) => {
      outputBuffer += data.toString();
      const lines = outputBuffer.split("\n");
      outputBuffer = lines.pop() || ""; // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim();

        // Parse TypeScript error format: file.ts(10,5): error TS2322: message
        // Match pattern: filename(line,col): error code: message
        const errorMatch = trimmed.match(
          /^(.+?)\((\d+),(\d+)\):\s+error\s+(TS\d+)?\s*:?\s*(.+)$/,
        );
        if (errorMatch) {
          const [, file, lineStr, colStr, , message] = errorMatch;
          if (file && lineStr && colStr && message) {
            let cleanFile = file.trim();
            if (isAbsolute(cleanFile)) {
              cleanFile = relative(process.cwd(), cleanFile);
            }
            currentErrors.push({
              file: cleanFile,
              line: Number.parseInt(lineStr, 10),
              col: Number.parseInt(colStr, 10),
              message: message.trim(),
            });
          }
        }

        if (trimmed.includes("Found") && trimmed.includes("error")) {
          setTsErrors(trimmed.match(/Found 0 error/) ? [] : [...currentErrors]);
          currentErrors = [];
        }
      }
    };

    if (tsProcess.stdout) {
      tsProcess.stdout.on("data", processOutput);
    }
    if (tsProcess.stderr) {
      tsProcess.stderr.on("data", processOutput);
    }

    return () => {
      if (tsProcessRef.current) {
        tsProcessRef.current.kill();
      }
    };
  }, []);

  return tsErrors;
}
