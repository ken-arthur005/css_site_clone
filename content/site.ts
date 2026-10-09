import type { SiteInfo } from "@/types/site";

const approvedOrigin = "https://thecssknust.com";

function canonicalOrigin(): string {
  try {
    const configured = new URL(process.env.NEXT_PUBLIC_SITE_ORIGIN ?? approvedOrigin);
    // The custom domain supersedes older preview/deployment origin settings.
    return configured.hostname === "vercel.app" || configured.hostname.endsWith(".vercel.app") ? approvedOrigin : configured.origin;
  } catch { return approvedOrigin; }
}

export const siteInfo = {
  name: "Computer Science Society, KNUST",
  shortName: "CSS KNUST",
  institution: "Kwame Nkrumah University of Science and Technology",
  college: "College of Science",
  location: "Kumasi, Ghana",
  canonicalOrigin: {
    value: canonicalOrigin(),
    contentStatus: "verified",
  },
  socials: [
    { platform: "Instagram", url: "https://www.instagram.com/thecssknust" },
    { platform: "TikTok", url: "https://www.tiktok.com/@thecssknust" },
    { platform: "X", url: "https://x.com/thecssknust" },
    { platform: "YouTube", url: "https://www.youtube.com/@thecssknust" },
  ],
  contact: {},
} satisfies SiteInfo;
