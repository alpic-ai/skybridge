"use client";

import { useEffect, useState } from "react";

const MOBILE_VISIBLE_COUNT = 5;

export function ChangelogControls({ totalCount }: { totalCount: number }) {
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const list = document.querySelector<HTMLElement>(".sx-cl-toc-list");
    if (!list) {
      return;
    }
    list.classList.toggle("is-collapsed", !showAll);
  }, [showAll]);

  if (totalCount <= MOBILE_VISIBLE_COUNT) {
    return null;
  }

  return (
    <button
      type="button"
      className="sx-cl-toc-more"
      onClick={() => setShowAll((v) => !v)}
    >
      {showAll ? "Show fewer" : `Show all ${totalCount} versions`}
    </button>
  );
}
