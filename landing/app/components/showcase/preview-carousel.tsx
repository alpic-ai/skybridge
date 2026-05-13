"use client";

import { useState } from "react";
import { ChatGPTFrame } from "./chatgpt-frame";
import type { ShowcaseApp } from "./data";

export function PreviewCarousel({ app }: { app: ShowcaseApp }) {
  const explicit = app.screenshots || [];
  const slides = app.img ? [app.img, ...explicit] : explicit;
  const [index, setIndex] = useState(0);
  const total = slides.length;
  const single = total <= 1;
  const go = (target: number) =>
    total && setIndex(((target % total) + total) % total);
  const next = () => go(index + 1);
  const prev = () => go(index - 1);

  if (app.noWidget || total === 0) {
    return (
      <div className="sxD-carousel is-single">
        <div className="sxD-carousel-stage">
          <ChatGPTFrame app={app} priority />
        </div>
      </div>
    );
  }

  return (
    <div className={`sxD-carousel ${single ? "is-single" : ""}`}>
      <div className="sxD-carousel-stage">
        <ChatGPTFrame
          app={app}
          imageOverride={slides[index]}
          priority={index === 0}
        />
      </div>
      {!single && (
        <>
          <button
            className="sxD-carousel-arrow sxD-carousel-prev"
            onClick={prev}
            aria-label="Previous"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <button
            className="sxD-carousel-arrow sxD-carousel-next"
            onClick={next}
            aria-label="Next"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
          <div className="sxD-carousel-dots">
            {slides.map((_, slideIndex) => (
              <button
                key={slideIndex}
                className={`sxD-carousel-dot ${slideIndex === index ? "is-active" : ""}`}
                onClick={() => go(slideIndex)}
                aria-label={`Go to slide ${slideIndex + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
