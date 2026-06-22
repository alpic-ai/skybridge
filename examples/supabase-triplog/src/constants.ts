// Single source of truth for trip statuses/categories and their display metadata.
// Shared by the server (Zod enums) and the views (filters, colors, icons).

export const CATEGORIES = [
  "business",
  "family",
  "solo",
  "adventure",
  "leisure",
] as const;
export const STATUSES = ["completed", "ongoing", "upnext"] as const;

// Slug stored in `cover_url` when a trip has no cover image (resolves to a bundled fallback).
export const DEFAULT_COVER = "earth";

export type Category = (typeof CATEGORIES)[number];
export type Status = (typeof STATUSES)[number];

export const CATEGORY_META: Record<Category, { label: string; icon: string }> =
  {
    business: { label: "Business", icon: "💼" },
    family: { label: "Family", icon: "👨‍👩‍👧" },
    solo: { label: "Solo", icon: "🧍" },
    adventure: { label: "Adventure", icon: "🏔️" },
    leisure: { label: "Leisure", icon: "🌴" },
  };

export const STATUS_META: Record<Status, { label: string; color: string }> = {
  completed: { label: "Completed", color: "#22c55e" },
  ongoing: { label: "Ongoing", color: "#3b82f6" },
  upnext: { label: "Up Next", color: "#f59e0b" },
};
