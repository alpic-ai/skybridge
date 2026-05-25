"use client";

import { useRef, useState } from "react";

const cache = new Map<string, string>();

export function LazyChanges({ slug, count }: { slug: string; count: number }) {
  const [html, setHtml] = useState<string | null>(
    () => cache.get(slug) ?? null,
  );
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const inFlight = useRef(false);

  const label =
    count > 0
      ? `Show ${count} merged PR${count === 1 ? "" : "s"}`
      : "Show changes";

  const onToggle = async (event: React.SyntheticEvent<HTMLDetailsElement>) => {
    if (!event.currentTarget.open || html || inFlight.current) {
      return;
    }
    inFlight.current = true;
    setStatus("loading");
    try {
      const base = window.location.pathname.replace(/\/+$/, "");
      const res = await fetch(`${base}/data/${slug}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const text = await res.text();
      cache.set(slug, text);
      setHtml(text);
      setStatus("idle");
    } catch {
      setStatus("error");
    } finally {
      inFlight.current = false;
    }
  };

  return (
    <details className="sx-cl-changes" onToggle={onToggle}>
      <summary className="sx-cl-changes-summary">
        <span className="sx-cl-changes-label">{label}</span>
        <span className="sx-cl-changes-chev" aria-hidden>
          ▾
        </span>
      </summary>
      <div className="sx-cl-body sx-cl-changes-body">
        {html ? (
          // biome-ignore lint/security/noDangerouslySetInnerHtml: html is generated at build time from our own repo
          <div dangerouslySetInnerHTML={{ __html: html }} />
        ) : status === "error" ? (
          <p className="sx-cl-empty-body">Couldn&apos;t load this list.</p>
        ) : (
          <p className="sx-cl-empty-body">Loading…</p>
        )}
      </div>
    </details>
  );
}
