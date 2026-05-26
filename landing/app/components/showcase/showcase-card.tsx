"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChatGPTFrame } from "./chatgpt-frame";
import { getShowcasePreviews, type ShowcaseApp } from "./data";

const INITIAL_DELAY_MS = 150;
const CYCLE_INTERVAL_MS = 1500;

export function ShowcaseCard({
  app,
  index,
  children,
}: {
  app: ShowcaseApp;
  index: number;
  children: React.ReactNode;
}) {
  const previews = getShowcasePreviews(app);
  const [previewIndex, setPreviewIndex] = useState(0);
  const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canCycle = previews.length > 1;

  const stopCycling = useCallback(() => {
    if (delayRef.current) {
      clearTimeout(delayRef.current);
      delayRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setPreviewIndex(0);
  }, []);

  const startCycling = useCallback(() => {
    if (!canCycle) {
      return;
    }
    stopCycling();
    delayRef.current = setTimeout(() => {
      setPreviewIndex(1);
      timerRef.current = setInterval(() => {
        setPreviewIndex((prev) => (prev + 1) % previews.length);
      }, CYCLE_INTERVAL_MS);
    }, INITIAL_DELAY_MS);
  }, [canCycle, previews.length, stopCycling]);

  useEffect(() => stopCycling, [stopCycling]);

  return (
    <Link
      href={`/showcase/${app.slug}`}
      className="sxA-card"
      style={{ "--card-accent": app.accent } as React.CSSProperties}
      onMouseEnter={startCycling}
      onMouseLeave={stopCycling}
    >
      <div className="sxA-thumb">
        {canCycle ? (
          <div className="sxA-thumb-stack">
            {previews.map((preview, i) => (
              <div
                key={i}
                className="sxA-thumb-layer"
                style={{ opacity: i === previewIndex ? 1 : 0 }}
              >
                <ChatGPTFrame
                  app={app}
                  compact
                  preview={preview}
                  priority={index === 0 && i === 0}
                />
              </div>
            ))}
          </div>
        ) : (
          <ChatGPTFrame
            app={app}
            compact
            preview={previews[0]}
            priority={index === 0}
          />
        )}
      </div>
      {children}
    </Link>
  );
}
