interface Warning {
  message: string;
}

function hasExportDefault(code: string): boolean {
  return (
    /export\s+default\s/.test(code) ||
    /export\s*\{[^}]*\bas\s+default\b[^}]*}/.test(code)
  );
}

function hasMountWidgetCall(code: string): boolean {
  return /mountWidget\s*\(/.test(code);
}

function stripComments(code: string): string {
  return code.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

export function validateWidget(code: string, filePath: string): Warning[] {
  code = stripComments(code);
  const warnings: Warning[] = [];
  const fileName = filePath.split("/").pop() ?? filePath;

  if (!hasExportDefault(code)) {
    warnings.push({
      message: `Widget file "${fileName}" is missing a default export. Add "export default <ComponentName>" to ensure the widget is properly registered.`,
    });
  }

  if (!hasMountWidgetCall(code)) {
    warnings.push({
      message: `Widget file "${fileName}" is missing a mountWidget() call. Add "mountWidget(<Component />)" to mount the component to the DOM.`,
    });
  }

  return warnings;
}
