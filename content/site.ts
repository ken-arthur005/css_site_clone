import type { SiteInfo } from "@/types/site";

const planningOrigin = "https://thecssknust.com";

export const siteInfo = {
  name: "Computer Science Society, KNUST",
  shortName: "CSS KNUST",
  institution: "Kwame Nkrumah University of Science and Technology",
  college: "College of Science",
  location: "Kumasi, Ghana",
  canonicalOrigin: {
    value: process.env.NEXT_PUBLIC_SITE_ORIGIN ?? planningOrigin,
    contentStatus: "placeholder",
  },
  socials: [
    { platform: "Instagram", url: "https://www.instagram.com/thecssknust" },
    { platform: "TikTok", url: "https://www.tiktok.com/@thecssknust" },
    { platform: "X", url: "https://x.com/thecssknust" },
    { platform: "YouTube", url: "https://www.youtube.com/@thecssknust" },
  ],
  contact: {},
} satisfies SiteInfo;
