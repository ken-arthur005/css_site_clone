import type { ContentAsset, ContentStatus } from "./content";
import type { SiteSocial } from "./site";

export type Executive = {
  id: string;
  slug: string;
  name: string;
  role: string;
  order: number;
  contentStatus: ContentStatus;
  portrait?: ContentAsset;
  quote?: string;
  biography?: string;
  socials?: SiteSocial[];
  committee?: string;
};
