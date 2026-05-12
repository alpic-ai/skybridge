import type { MetadataRoute } from "next";
import { SHOWCASE } from "./components/showcase/data";

const BASE = "https://skybridge.tech";

export const dynamic = "force-static";
export const revalidate = false;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: `${BASE}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE}/showcase`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...SHOWCASE.map((app) => ({
      url: `${BASE}/showcase/${app.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
