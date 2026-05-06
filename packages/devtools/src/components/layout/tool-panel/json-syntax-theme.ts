import type { CSSProperties } from "react";
import oneLight from "react-syntax-highlighter/dist/esm/styles/prism/one-light";

const key = "#121212";
const str = "#3d6b69";
const num = "#c55a44";
const punct = "#707070";
const bg = "transparent";

const mono =
  '"JetBrains Mono Variable", "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

export const devtoolsJsonPrismTheme: Record<string, CSSProperties> = {
  ...oneLight,
  'code[class*="language-"]': {
    ...oneLight['code[class*="language-"]'],
    background: bg,
    color: key,
    fontFamily: mono,
  },
  'pre[class*="language-"]': {
    ...oneLight['pre[class*="language-"]'],
    background: bg,
    color: key,
    fontFamily: mono,
    padding: 0,
    margin: 0,
    overflow: "visible",
  },
  property: { color: key },
  string: { color: str },
  number: { color: num },
  boolean: { color: num },
  punctuation: { color: punct },
  operator: { color: punct },
  ".language-json .token.operator": {
    color: punct,
  },
  ".language-json .token.null.keyword": {
    color: punct,
  },
};
