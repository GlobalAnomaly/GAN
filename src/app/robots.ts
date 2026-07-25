import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Search result pages are thin and infinitely variable. Keeping them out
      // of the index protects the ranking of the actual case pages.
      disallow: ["/search"],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
