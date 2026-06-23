import "@/index.css";

import { type Dispatch, type SetStateAction, useState } from "react";
import { useLayout } from "skybridge/web";
import { TripCarousel } from "../components/trip-carousel.js";
import { TripDetail } from "../components/trip-detail.js";
import {
  CATEGORIES,
  CATEGORY_META,
  type Category,
  STATUS_META,
  STATUSES,
  type Status,
} from "../constants.js";
import { useToolInfo } from "../helpers.js";

function Header({ count }: { count?: number }) {
  return (
    <div className="app-header">
      <div className="app-header-left">
        <h1 className="app-title">My Trips</h1>
        <span className="app-subtitle">Personal travel log</span>
      </div>
      {count !== undefined && (
        <span className="result-badge">{count} trips</span>
      )}
    </div>
  );
}

function BrowseTrips() {
  const { theme } = useLayout();
  const { output, isPending, input } = useToolInfo<"browse-trips">();

  const [focusDismissed, setFocusDismissed] = useState(false);
  const [activeStatuses, setActiveStatuses] = useState<Set<Status>>(
    () => new Set(input?.status ?? []),
  );
  const [activeCategories, setActiveCategories] = useState<Set<Category>>(
    () => new Set(input?.category ?? []),
  );
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const toggleFilter = <T,>(
    setter: Dispatch<SetStateAction<Set<T>>>,
    value: T,
  ) => {
    setFocusDismissed(true);
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
    setSelectedId(null);
  };

  const clearFilters = () => {
    setFocusDismissed(true);
    setActiveStatuses(new Set());
    setActiveCategories(new Set());
    setSelectedId(null);
  };

  const hasActiveFilters = activeStatuses.size > 0 || activeCategories.size > 0;

  if (isPending) {
    return (
      <div className={`${theme} container`}>
        <Header />
        <div className="message">Loading your trip log…</div>
      </div>
    );
  }

  if (!output || output.trips.length === 0) {
    return (
      <div className={`${theme} container`}>
        <Header />
        <div className="message">No trips found.</div>
      </div>
    );
  }

  const totalTrips = output.trips.length;
  const focusPlace = focusDismissed ? undefined : input?.focusPlace;
  const focusedTrip = focusPlace
    ? (output.trips.find(
        (t) => t.place.toLowerCase() === focusPlace.toLowerCase(),
      ) ?? null)
    : null;

  const visibleTrips =
    focusedTrip !== null
      ? [focusedTrip]
      : output.trips
          .filter(
            (t) => activeStatuses.size === 0 || activeStatuses.has(t.status),
          )
          .filter(
            (t) =>
              activeCategories.size === 0 || activeCategories.has(t.category),
          );

  const selected =
    visibleTrips.find((t) => t.id === selectedId) ?? visibleTrips[0];

  return (
    <div className={`${theme} container`}>
      <Header count={totalTrips} />

      <div className="filter-section">
        <div className="filter-row">
          <span className="filter-row-label">Status</span>
          <div className="filter-pills">
            {STATUSES.map((value) => (
              <button
                key={value}
                type="button"
                className={`filter-pill filter-pill-${value} ${activeStatuses.has(value) ? "active" : ""}`}
                onClick={() => toggleFilter(setActiveStatuses, value)}
              >
                <span
                  className="pill-dot"
                  style={{ background: STATUS_META[value].color }}
                />
                {STATUS_META[value].label}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-row">
          <span className="filter-row-label">Category</span>
          <div className="filter-pills">
            {CATEGORIES.map((value) => (
              <button
                key={value}
                type="button"
                className={`filter-pill filter-cat ${activeCategories.has(value) ? "active" : ""}`}
                onClick={() => toggleFilter(setActiveCategories, value)}
              >
                <span className="cat-icon">{CATEGORY_META[value].icon}</span>
                {CATEGORY_META[value].label}
              </button>
            ))}
          </div>
        </div>

        {hasActiveFilters && (
          <div className="filter-actions">
            <span className="filter-active-label">
              {visibleTrips.length === totalTrips
                ? `All ${totalTrips} trips`
                : `${visibleTrips.length} of ${totalTrips} trips`}
            </span>
            <button type="button" className="clear-btn" onClick={clearFilters}>
              ✕ Clear
            </button>
          </div>
        )}
      </div>

      {visibleTrips.length === 0 ? (
        <div className="no-results">
          <span className="no-results-icon">🔍</span>
          <span className="no-results-label">
            No trips match the selected filters
          </span>
          <button
            type="button"
            className="no-results-action"
            onClick={clearFilters}
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <>
          <TripCarousel
            trips={visibleTrips}
            selectedId={selected.id}
            onSelect={setSelectedId}
          />
          <TripDetail trip={selected} />
        </>
      )}
    </div>
  );
}

export default BrowseTrips;
