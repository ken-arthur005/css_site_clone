import type { Metadata } from "next";
import { getSiteInfo } from "@/lib/content/site";
import type { ContentAsset } from "@/types/content";

type PageMetadata = {
  title: string;
  description: string;
  path: string;
  image?: Pick<ContentAsset, "src" | "alt">;
  index?: boolean;
};

export async function getPageMetadata({ title, description, path, image, index = true }: PageMetadata): Promise<Metadata> {
  const site = await getSiteInfo();
  const origin = site.canonicalOrigin.contentStatus === "verified" ? site.canonicalOrigin.value : undefined;
  const canonical = origin ? new URL(path, origin).href : undefined;
  const images = image && origin ? [{ url: new URL(image.src, origin).href, alt: image.alt }] : undefined;

  return {
    title,
    description,
    ...(canonical ? { alternates: { canonical } } : {}),
    robots: { index, follow: true },
    openGraph: {
      title, description, siteName: site.shortName, type: "website", locale: "en_GH",
      ...(canonical ? { url: canonical } : {}),
      ...(images ? { images } : {}),
    },
    twitter: { card: images ? "summary_large_image" : "summary", title, description, ...(images ? { images } : {}) },
  };
}
