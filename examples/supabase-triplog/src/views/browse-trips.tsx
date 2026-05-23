import "@/index.css";

import { useState } from "react";
import { useLayout } from "skybridge/web";
import { TripCarousel } from "../components/trip-carousel.js";
import { TripDetail } from "../components/trip-detail.js";
import { useToolInfo } from "../helpers.js";
import type { Trip } from "../types.js";

const STATUS_FILTERS: { label: string; value: Trip["status"]; dot: string }[] = [
  { label: "Completed", value: "completed", dot: "#22c55e" },
  { label: "Ongoing",   value: "ongoing",   dot: "#3b82f6" },
  { label: "Up Next",   value: "upnext",    dot: "#f59e0b" },
];

const CATEGORY_FILTERS: { label: string; value: Trip["category"]; icon: string }[] = [
  { label: "Business",  value: "business",  icon: "💼" },
  { label: "Family",    value: "family",    icon: "👨‍👩‍👧" },
  { label: "Solo",      value: "solo",      icon: "🧍" },
  { label: "Adventure", value: "adventure", icon: "🏔️" },
  { label: "Leisure",   value: "leisure",   icon: "🌴" },
];

function BrowseTrips() {
  const { theme } = useLayout();
  const { output, isPending, input } = useToolInfo<"browse-trips">();

  const [focusDismissed, setFocusDismissed] = useState(false);
  const [activeStatuses, setActiveStatuses] = useState<Set<Trip["status"]>>(
    () => new Set(input?.status ?? []),
  );
  const [activeCategories, setActiveCategories] = useState<Set<Trip["category"]>>(
    () => new Set(input?.category ?? []),
  );
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const toggleStatus = (value: Trip["status"]) => {
    setFocusDismissed(true);
    setActiveStatuses((prev) => {
      const next = new Set(prev);
      next.has(value) ? next.delete(value) : next.add(value);
      return next;
    });
    setSelectedId(null);
  };

  const toggleCategory = (value: Trip["category"]) => {
    setFocusDismissed(true);
    setActiveCategories((prev) => {
      const next = new Set(prev);
      next.has(value) ? next.delete(value) : next.add(value);
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
        <div className="app-header">
          <div className="app-header-left">
            <h1 className="app-title">My Trips</h1>
            <span className="app-subtitle">Personal travel log</span>
          </div>
        </div>
        <div className="message">Loading your trip log…</div>
      </div>
    );
  }

  if (!output || output.trips.length === 0) {
    return (
      <div className={`${theme} container`}>
        <div className="app-header">
          <div className="app-header-left">
            <h1 className="app-title">My Trips</h1>
            <span className="app-subtitle">Personal travel log</span>
          </div>
        </div>
        <div className="message">No trips found.</div>
      </div>
    );
  }

  const totalTrips = output.trips.length;
  const focusedTrip =
    !focusDismissed && input?.focusPlace
      ? output.trips.find(
          (t) => t.place.toLowerCase() === input.focusPlace!.toLowerCase()
        ) ?? null
      : null;

  const visibleTrips = focusedTrip !== null
    ? [focusedTrip]
    : output.trips
        .filter((t) => activeStatuses.size === 0 || activeStatuses.has(t.status))
        .filter((t) => activeCategories.size === 0 || activeCategories.has(t.category));

  const selected =
    visibleTrips.find((t) => t.id === selectedId) ?? visibleTrips[0];

  return (
    <div className={`${theme} container`}>
      <div className="app-header">
        <div className="app-header-left">
          <h1 className="app-title">My Trips</h1>
          <span className="app-subtitle">Personal travel log</span>
        </div>
        <span className="result-badge">{totalTrips} trips</span>
      </div>

      <div className="filter-section">
        <div className="filter-row">
          <span className="filter-row-label">Status</span>
          <div className="filter-pills">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                className={`filter-pill filter-pill-${f.value} ${activeStatuses.has(f.value) ? "active" : ""}`}
                onClick={() => toggleStatus(f.value)}
              >
                <span className="pill-dot" style={{ background: f.dot }} />
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-row">
          <span className="filter-row-label">Category</span>
          <div className="filter-pills">
            {CATEGORY_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                className={`filter-pill filter-cat ${activeCategories.has(f.value) ? "active" : ""}`}
                onClick={() => toggleCategory(f.value)}
              >
                <span className="cat-icon">{f.icon}</span>
                {f.label}
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
          <span className="no-results-label">No trips match the selected filters</span>
          <button type="button" className="no-results-action" onClick={clearFilters}>
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
