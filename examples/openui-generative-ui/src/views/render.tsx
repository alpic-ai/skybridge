import "@/index.css";

import { type OpenUIError, Renderer } from "@openuidev/react-lang";
import { useEffect, useState } from "react";
import { useUser } from "skybridge/web";
import { useToolInfo } from "../helpers.js";
import { openuiLibrary } from "../openui/library.js";

function formatError(error: OpenUIError): string {
  const statement = error.statementId ? `"${error.statementId}": ` : "";
  const hint = error.hint ? ` Hint: ${error.hint}` : "";
  return `[${error.source}] ${statement}${error.message}${hint}`;
}

function RenderWidget() {
  const { input, isPending } = useToolInfo<"render">();
  const { theme } = useUser();
  const [errors, setErrors] = useState<OpenUIError[]>([]);
  const code = typeof input?.code === "string" ? input.code : null;

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset parser errors when a new program is loaded
  useEffect(() => {
    setErrors([]);
  }, [code]);

  if (!code) {
    return (
      <div
        className={`${theme === "dark" ? "dark" : ""} flex min-h-screen flex-col items-center justify-center gap-2 bg-background text-center text-muted-foreground`}
      >
        <strong className="text-foreground">Waiting for OpenUI Lang...</strong>
        <span>Call render with generated OpenUI Lang.</span>
      </div>
    );
  }

  return (
    <div
      className={`${theme === "dark" ? "dark" : ""} renderer-shell min-h-screen bg-background p-7 text-foreground`}
    >
      <Renderer
        library={openuiLibrary}
        response={code}
        isStreaming={isPending}
        onError={setErrors}
      />
      {errors.length > 0 ? (
        <details className="error-panel">
          <summary>OpenUI parse issues</summary>
          <pre>{errors.map(formatError).join("\n\n")}</pre>
        </details>
      ) : null}
    </div>
  );
}

export default RenderWidget;
