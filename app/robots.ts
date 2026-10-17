import type { MetadataRoute } from "next";
import { getSiteInfo } from "@/lib/content/site";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const site = await getSiteInfo();
  return {
    // Crawlers must be able to fetch event details to read their noindex tags.
    rules: { userAgent: "*", allow: "/" },
    ...(site.canonicalOrigin.contentStatus === "verified"
      ? { sitemap: new URL("/sitemap.xml", site.canonicalOrigin.value).href }
      : {}),
  };
}
