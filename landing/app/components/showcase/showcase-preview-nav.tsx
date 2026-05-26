"use client";

import type { ReactElement } from "react";

type ShowcasePreviewNavProps = {
  onPrev: () => void;
  onNext: () => void;
};

/** Chevrons over the full ChatGPT/Claude mock (detail carousel). */
export function ShowcasePreviewNav({
  onPrev,
  onNext,
}: ShowcasePreviewNavProps): ReactElement | null {
  return (
    <>
      <button
        type="button"
        className="sxD-frame-nav-arrow sxD-frame-nav-prev"
        onClick={onPrev}
        aria-label="Previous preview"
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
          aria-hidden={true}
        >
          <path d="M15 6l-6 6 6 6" />
        </svg>
      </button>
      <button
        type="button"
        className="sxD-frame-nav-arrow sxD-frame-nav-next"
        onClick={onNext}
        aria-label="Next preview"
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
          aria-hidden={true}
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
    </>
  );
}
