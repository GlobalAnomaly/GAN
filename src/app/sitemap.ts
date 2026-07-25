import type { MetadataRoute } from "next";
import { getAllCaseSlugs, getAllScienceSlugs } from "@/lib/content";
import { SITE } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [caseSlugs, scienceSlugs] = await Promise.all([
    getAllCaseSlugs(),
    getAllScienceSlugs(),
  ]);

  const staticRoutes = [
    { path: "", priority: 1 },
    { path: "/cases", priority: 0.9 },
    { path: "/science", priority: 0.9 },
    { path: "/browse", priority: 0.7 },
    { path: "/about", priority: 0.6 },
    { path: "/privacy", priority: 0.2 },
    { path: "/terms", priority: 0.2 },
    { path: "/takedown", priority: 0.2 },
  ];

  return [
    ...staticRoutes.map((r) => ({
      url: `${SITE.url}${r.path}`,
      lastModified: new Date(),
      priority: r.priority,
    })),
    ...caseSlugs.map((slug) => ({
      url: `${SITE.url}/cases/${slug}`,
      lastModified: new Date(),
      priority: 0.8,
    })),
    ...scienceSlugs.map((slug) => ({
      url: `${SITE.url}/science/${slug}`,
      lastModified: new Date(),
      priority: 0.8,
    })),
  ];
}
