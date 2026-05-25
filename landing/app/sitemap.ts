import type { MetadataRoute } from "next";
import { SHOWCASE } from "./components/showcase/data";

const BASE = "https://skybridge.tech";

const SITE_UPDATED = new Date("2026-05-18");

export const dynamic = "force-static";
export const revalidate = false;

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${BASE}/`,
      lastModified: SITE_UPDATED,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE}/showcase`,
      lastModified: SITE_UPDATED,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE}/changelog`,
      lastModified: SITE_UPDATED,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...SHOWCASE.map((app) => ({
      url: `${BASE}/showcase/${app.slug}`,
      lastModified: app.updatedAt ?? SITE_UPDATED,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
