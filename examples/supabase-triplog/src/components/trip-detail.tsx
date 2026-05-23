import type { Trip } from "../types.js";

interface TripDetailProps {
  trip: Trip;
}

const STATUS_META: Record<Trip["status"], { label: string; cls: string }> = {
  completed: { label: "Completed", cls: "badge-completed" },
  ongoing:   { label: "Ongoing",   cls: "badge-ongoing"   },
  upnext:    { label: "Up Next",   cls: "badge-upnext"    },
};

const CATEGORY_ICON: Record<Trip["category"], string> = {
  business:  "💼",
  family:    "👨‍👩‍👧",
  solo:      "🧍",
  adventure: "🏔️",
  leisure:   "🌴",
};

export function TripDetail({ trip }: TripDetailProps) {
  const { label: statusLabel, cls: statusCls } = STATUS_META[trip.status];

  const dateLabel = new Date(`${trip.date}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="detail-card">
      <div className="detail-image-side">
        <img src={trip.cover_url} alt={trip.place} className="detail-cover-img" />
        <div className="detail-image-overlay" />
        <div className="detail-image-label">
          <span className="detail-image-place">{trip.place}</span>
          {trip.country && (
            <span className="detail-image-country">📍 {trip.country}</span>
          )}
        </div>
      </div>

      <div className="detail-info">
        <div className="info-row">
          <span className="info-key">City</span>
          <span className="info-val">{trip.place}</span>
        </div>

        {trip.country && (
          <div className="info-row">
            <span className="info-key">Country</span>
            <span className="info-val">{trip.country}</span>
          </div>
        )}

        <div className="info-row">
          <span className="info-key">Date</span>
          <span className="info-val">{dateLabel}</span>
        </div>

        <div className="info-row">
          <span className="info-key">Status</span>
          <span className="info-val">
            <span className={`badge ${statusCls}`}>{statusLabel}</span>
          </span>
        </div>

        <div className="info-row">
          <span className="info-key">Category</span>
          <span className="info-val">
            <span className="category-chip">
              <span className="category-chip-icon">{CATEGORY_ICON[trip.category]}</span>
              {trip.category}
            </span>
          </span>
        </div>

        {trip.expenses > 0 && (
          <div className="info-row">
            <span className="info-key">Spent</span>
            <span className="info-val">${trip.expenses.toLocaleString()}</span>
          </div>
        )}

        {trip.description && (
          <div className="info-row info-row-notes">
            <span className="info-key">Notes</span>
            <span className="info-val info-val-notes">{trip.description}</span>
          </div>
        )}
      </div>
    </div>
  );
}
