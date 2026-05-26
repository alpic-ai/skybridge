"use client";

import { type ChangeEvent, useEffect, useState } from "react";

const MOBILE_VISIBLE_COUNT = 5;

export function ChangelogControls({ totalCount }: { totalCount: number }) {
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    const items = document.querySelectorAll<HTMLElement>("[data-cl-search]");
    let visible = 0;
    items.forEach((el) => {
      const haystack = (el.dataset.clSearch ?? "").toLowerCase();
      const match = q === "" || haystack.includes(q);
      el.hidden = !match;
      if (match) {
        visible += 1;
      }
    });
    const empty = document.getElementById("sx-cl-empty");
    if (empty) {
      empty.hidden = visible !== 0;
    }
  }, [query]);

  useEffect(() => {
    const list = document.querySelector<HTMLElement>(".sx-cl-toc-list");
    if (!list) {
      return;
    }
    const expanded = showAll || query.trim() !== "";
    list.classList.toggle("is-collapsed", !expanded);
  }, [showAll, query]);

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  };

  const showMoreButton =
    totalCount > MOBILE_VISIBLE_COUNT && query.trim() === "" ? (
      <button
        type="button"
        className="sx-cl-toc-more"
        onClick={() => setShowAll((v) => !v)}
      >
        {showAll ? "Show fewer" : `Show all ${totalCount} versions`}
      </button>
    ) : null;

  return (
    <div className="sx-cl-controls">
      <label className="sx-cl-search">
        <span className="sb-sr-only">Search releases</span>
        <span className="sx-cl-search-icon" aria-hidden>
          ⌕
        </span>
        <input
          type="search"
          placeholder="Search releases"
          value={query}
          onChange={onChange}
          className="sx-cl-search-input"
        />
      </label>
      {showMoreButton}
    </div>
  );
}
