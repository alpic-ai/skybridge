"use client";

import { useState } from "react";
import { ChatGPTFrame } from "./chatgpt-frame";
import { getShowcasePreviews, type ShowcaseApp } from "./data";
import { ShowcasePreviewNav } from "./showcase-preview-nav";

export function PreviewCarousel({ app }: { app: ShowcaseApp }) {
  const previews = getShowcasePreviews(app);
  const [index, setIndex] = useState(0);
  const total = previews.length;
  const single = total <= 1;
  const go = (target: number) =>
    total && setIndex(((target % total) + total) % total);
  const next = () => go(index + 1);
  const prev = () => go(index - 1);

  if (total === 0) {
    return (
      <div className="sxD-carousel is-single">
        <div className="sxD-carousel-stage">
          <ChatGPTFrame app={app} priority />
        </div>
      </div>
    );
  }

  const frameNav = !single ? (
    <ShowcasePreviewNav onPrev={prev} onNext={next} />
  ) : null;

  return (
    <div className={`sxD-carousel ${single ? "is-single" : ""}`}>
      <div className="sxD-carousel-stage">
        <ChatGPTFrame
          app={app}
          preview={previews[index]}
          priority={index === 0}
        />
      </div>
      {frameNav}
    </div>
  );
}
