import { useLayout } from "skybridge/web";
import { Code } from "@/views/components/ui.js";
import { useAutoReport } from "../context.js";
import type { HookDef, MemberResult } from "../types.js";

function LayoutTheme() {
  const { theme } = useLayout();
  const result =
    theme === "light" || theme === "dark"
      ? { support: "supported" as const, detail: `theme="${theme}"` }
      : {
          support: "error" as const,
          detail: `unexpected theme value: ${String(theme)}`,
        };
  useAutoReport(result);
  return <Code>theme = {String(theme)}</Code>;
}

function LayoutMaxHeight() {
  const { maxHeight } = useLayout();
  let result: MemberResult;
  if (typeof maxHeight === "number" && maxHeight > 0) {
    result = {
      support: "supported" as const,
      detail: `maxHeight=${maxHeight}`,
    };
  } else if (maxHeight === undefined) {
    result = {
      support: "unsupported" as const,
      detail: "host does not cap the view height",
    };
  } else {
    result = {
      support: "error" as const,
      detail: `unexpected maxHeight value: ${String(maxHeight)}`,
    };
  }
  useAutoReport(result);
  return <Code>maxHeight = {String(maxHeight)}</Code>;
}

function LayoutSafeArea() {
  const { safeArea } = useLayout();
  const insets = safeArea.insets;
  const allNumeric =
    typeof insets.top === "number" &&
    typeof insets.right === "number" &&
    typeof insets.bottom === "number" &&
    typeof insets.left === "number";
  const result = allNumeric
    ? {
        support: "supported" as const,
        detail: `insets {top:${insets.top}, right:${insets.right}, bottom:${insets.bottom}, left:${insets.left}}`,
      }
    : {
        support: "error" as const,
        detail: `safeArea.insets is not fully numeric: ${JSON.stringify(insets)}`,
      };
  useAutoReport(result);
  return (
    <Code>
      insets {insets.top}/{insets.right}/{insets.bottom}/{insets.left}
    </Code>
  );
}

export const useLayoutHook: HookDef = {
  name: "useLayout",
  source: "skybridge/web",
  docPath: "use-layout",
  summary: "Theme, max height and safe-area insets.",
  members: [
    {
      id: "useLayout.theme",
      name: "theme",
      description:
        'The host-reported color scheme. Supported when it is "light" or "dark".',
      kind: "auto",
      Test: LayoutTheme,
    },
    {
      id: "useLayout.maxHeight",
      name: "maxHeight",
      description:
        "The height cap the host imposes on the view. Supported when a positive number; unsupported (no-op) when the host leaves it undefined.",
      kind: "auto",
      Test: LayoutMaxHeight,
    },
    {
      id: "useLayout.safeArea",
      name: "safeArea",
      description:
        "Pixel insets to keep clear of (notches, home indicators). Supported when insets.top/right/bottom/left are all numbers.",
      kind: "auto",
      Test: LayoutSafeArea,
    },
  ],
};
