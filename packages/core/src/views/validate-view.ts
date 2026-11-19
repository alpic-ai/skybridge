// One pass, so a `//` or `/*` inside a string, template or regex literal does
// not start a comment. Literals are kept. A `/` is read as a regex only after
// one of `( , = : [ ! & | ? ;` or `return`. A backslash before a line break
// continues a string. An unclosed string or template runs to the end of its
// line or file, which keeps the scan linear.
const LITERAL_OR_COMMENT =
  /("(?:[^"\\\n]|\\(?:\r\n|[\s\S]))*"?|'(?:[^'\\\n]|\\(?:\r\n|[\s\S]))*'?|`(?:[^`\\]|\\[\s\S])*`?|(?<=(?:[(,=:[!&|?;]|\breturn)\s*)\/(?![*/])(?:[^/\\\n[]|\\.|\[(?:[^\]\\\n]|\\.)*\])+\/)|\/\/[^\n]*|\/\*[\s\S]*?\*\//g;

function stripComments(code: string): string {
  return code.replace(
    LITERAL_OR_COMMENT,
    (_match, literal?: string) => literal ?? "",
  );
}

export function hasDefaultExport(code: string): boolean {
  const stripped = stripComments(code);
  return (
    /export\s+default\s/.test(stripped) ||
    /export\s*\{[^}]*\bas\s+default\b[^}]*}/.test(stripped)
  );
}
