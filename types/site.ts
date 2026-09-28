import type { ContentStatus } from "./content";

export type SiteSocial = {
  platform: string;
  url: string;
};

export type SiteInfo = {
  name: string;
  shortName: string;
  institution: string;
  college: string;
  location: string;
  canonicalOrigin: {
    value: string;
    contentStatus: ContentStatus;
  };
  socials: SiteSocial[];
  contact: {
    email?: string;
    phone?: string;
  };
};
