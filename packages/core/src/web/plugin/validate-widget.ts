function stripComments(code: string): string {
  return code.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

export function hasDefaultExport(code: string, _filePath?: string): boolean {
  const stripped = stripComments(code);
  return (
    /export\s+default\s/.test(stripped) ||
    /export\s*\{[^}]*\bas\s+default\b[^}]*}/.test(stripped)
  );
}
