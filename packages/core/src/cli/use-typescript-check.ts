import { isAbsolute, relative } from "node:path";
import spawn from "cross-spawn";
import { useEffect, useState } from "react";

export type TsError = {
  file: string;
  line: number;
  col: number;
  code: string;
  message: string;
};

// TypeScript nests from general to specific — the deepest line is the root cause.
function extractBestMessage(
  message: string,
  continuationLines: Array<string>,
): string {
  if (!continuationLines.length) {
    return message;
  }
  let maxIndent = 0;
  for (const line of continuationLines) {
    const indent = line.length - line.trimStart().length;
    if (indent > maxIndent) {
      maxIndent = indent;
    }
  }
  const deepest = continuationLines
    .filter((l) => l.length - l.trimStart().length === maxIndent)
    .map((l) => l.trim())
    .filter(Boolean)[0];
  return deepest ?? message;
}

/**
 * Spawn `tsc --noEmit --watch` and report each completed check via `onErrors`
 * (empty array when the check is clean). Returns a cleanup function that kills
 * the watcher. Shared by the Ink-based dev UI (via {@link useTypeScriptCheck})
 * and the `--plain` runner.
 */
export function startTypeScriptCheck(
  onErrors: (errors: Array<TsError>) => void,
): () => void {
  const tsProcess = spawn(
    "npx",
    ["tsc", "--noEmit", "--watch", "--pretty", "false"],
    {
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  let outputBuffer = "";
  let currentErrors: Array<TsError> = [];
  let pendingError: TsError | null = null;
  let continuationLines: Array<string> = [];

  const flushPending = () => {
    if (!pendingError) {
      return;
    }
    pendingError.message = extractBestMessage(
      pendingError.message,
      continuationLines,
    );
    currentErrors.push(pendingError);
    pendingError = null;
    continuationLines = [];
  };

  const processOutput = (data: Buffer) => {
    outputBuffer += data.toString();
    const lines = outputBuffer.split("\n");
    outputBuffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();

      const errorMatch = trimmed.match(
        /^(.+?)\((\d+),(\d+)\):\s+error\s+(TS\d+)?\s*:?\s*(.+)$/,
      );
      if (errorMatch) {
        flushPending();
        const [, file, lineStr, colStr, code, message] = errorMatch;
        if (file && lineStr && colStr && message) {
          let cleanFile = file.trim();
          if (isAbsolute(cleanFile)) {
            cleanFile = relative(process.cwd(), cleanFile);
          }
          pendingError = {
            file: cleanFile,
            line: Number.parseInt(lineStr, 10),
            col: Number.parseInt(colStr, 10),
            code: code ?? "",
            message: message.trim(),
          };
        }
        continue;
      }

      if (pendingError && line.startsWith(" ")) {
        continuationLines.push(line);
        continue;
      }

      if (trimmed.includes("Found") && trimmed.includes("error")) {
        flushPending();
        onErrors(trimmed.match(/Found 0 error/) ? [] : [...currentErrors]);
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

  tsProcess.on("error", () => {
    onErrors([]);
  });

  return () => {
    tsProcess.kill();
  };
}

export function useTypeScriptCheck(): Array<TsError> {
  const [tsErrors, setTsErrors] = useState<Array<TsError>>([]);

  useEffect(() => startTypeScriptCheck(setTsErrors), []);

  return tsErrors;
}
