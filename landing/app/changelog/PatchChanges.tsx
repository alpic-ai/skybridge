"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function PatchChanges({
  count,
  markdown,
}: {
  count: number;
  markdown: string;
}) {
  const [open, setOpen] = useState(false);
  const noun =
    count > 0 ? `${count} merged PR${count === 1 ? "" : "s"}` : "changes";
  const label = `${open ? "Hide" : "Show"} ${noun}`;

  return (
    <details
      className="sx-cl-changes"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="sx-cl-changes-summary">
        <span className="sx-cl-changes-label">{label}</span>
        <span className="sx-cl-changes-chev" aria-hidden>
          ▾
        </span>
      </summary>
      <div className="sx-cl-body sx-cl-changes-body">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noreferrer">
                {children}
              </a>
            ),
          }}
        >
          {markdown}
        </ReactMarkdown>
      </div>
    </details>
  );
}
