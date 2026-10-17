import type { MetadataRoute } from "next";
import { getSiteInfo } from "@/lib/content/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = await getSiteInfo();
  if (site.canonicalOrigin.contentStatus !== "verified") return [];

  // Deliberately promote only the homepage and the four main public pages.
  // No invented last-modified dates, retired URLs, event details, or order URLs.
  return ["/", "/about", "/executives", "/events", "/merch"].map((path) => ({
    url: new URL(path, site.canonicalOrigin.value).href,
  }));
}
