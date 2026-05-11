import type { ReactNode } from "react";
import { useOpenExternal } from "skybridge/web";

export default function DocLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  // useOpenExternal: open a URL in a new browser tab from inside the iframe.
  const openExternal = useOpenExternal();
  return (
    <button
      type="button"
      onClick={() => openExternal(href)}
      className="underline underline-offset-4"
    >
      {children}
    </button>
  );
}
