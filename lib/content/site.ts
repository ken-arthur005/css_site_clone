import { siteInfo } from "@/content/site";
import type { SiteInfo } from "@/types/site";

export async function getSiteInfo(): Promise<SiteInfo> {
  return siteInfo;
}
