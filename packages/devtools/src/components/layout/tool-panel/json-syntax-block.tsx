import { PrismLight } from "react-syntax-highlighter";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";

import { devtoolsJsonPrismTheme } from "./json-syntax-theme.js";

PrismLight.registerLanguage("json", json);

export function JsonSyntaxBlock({ code }: { code: string }) {
  return (
    <PrismLight
      language="json"
      style={devtoolsJsonPrismTheme}
      customStyle={{
        margin: 0,
        padding: 0,
        background: "transparent",
        fontSize: "0.75rem",
      }}
      codeTagProps={{ className: "font-mono whitespace-pre" }}
      showLineNumbers={false}
      wrapLongLines
    >
      {code}
    </PrismLight>
  );
}
