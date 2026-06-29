import "@/index.css";

import { type OpenUIError, Renderer } from "@openuidev/react-lang";
import { useEffect, useState } from "react";
import { useToolInfo } from "../helpers.js";
import { openuiLibrary } from "../openui/library.js";

function formatError(error: OpenUIError): string {
  const statement = error.statementId ? `"${error.statementId}": ` : "";
  const hint = error.hint ? ` Hint: ${error.hint}` : "";
  return `[${error.source}] ${statement}${error.message}${hint}`;
}

function RenderWidget() {
  const { input } = useToolInfo<"render">();
  const [errors, setErrors] = useState<OpenUIError[]>([]);
  const code = typeof output?.code === "string" ? output.code : null;

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset parser errors when a new program is loaded
  useEffect(() => {
    setErrors([]);
  }, [code]);

  if (!code) {
    return (
      <div className="empty-state">
        <strong>Waiting for OpenUI Lang...</strong>
        <span>Call render-example or render with generated OpenUI Lang.</span>
      </div>
    );
  }

  return (
    <div className="renderer-shell">
      <Renderer
        library={openuiLibrary}
        response={code}
        isStreaming={false}
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
