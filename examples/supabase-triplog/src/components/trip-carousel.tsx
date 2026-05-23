import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Trip } from "../types.js";

interface TripCarouselProps {
  trips: Trip[];
  selectedId: number;
  onSelect: (id: number) => void;
}

const STATUS_COLOR: Record<Trip["status"], string> = {
  completed: "#22c55e",
  ongoing:   "#3b82f6",
  upnext:    "#f59e0b",
};

export function TripCarousel({ trips, selectedId, onSelect }: TripCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft]   = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateArrows = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 0);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  useEffect(() => {
    updateArrows();
    const el = scrollRef.current;
    el?.addEventListener("scroll", updateArrows, { passive: true });
    return () => el?.removeEventListener("scroll", updateArrows);
  }, [trips]);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -264 : 264, behavior: "smooth" });
  };

  return (
    <div className="carousel-wrap">
      {canLeft && (
        <button type="button" className="carousel-arrow carousel-arrow-left" onClick={() => scroll("left")}>
          <ChevronLeft size={15} strokeWidth={2.5} />
        </button>
      )}

      <div className="carousel" ref={scrollRef}>
        {trips.map((trip) => (
          <button
            key={trip.id}
            type="button"
            className={`trip-card ${selectedId === trip.id ? "selected" : ""}`}
            onClick={() => onSelect(trip.id)}
          >
            <img src={trip.cover_url} alt={trip.place} className="trip-cover" />
            <div className="trip-card-overlay" />
            <span className="status-dot" style={{ background: STATUS_COLOR[trip.status] }} />
            <div className="trip-card-info">
              <div className="trip-title">{trip.place}</div>
              {trip.country && <div className="trip-country">{trip.country}</div>}
            </div>
          </button>
        ))}
      </div>

      {canRight && (
        <button type="button" className="carousel-arrow carousel-arrow-right" onClick={() => scroll("right")}>
          <ChevronRight size={15} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
