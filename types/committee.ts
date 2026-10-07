import type { Executive } from "./executive";

export type CommitteeMember = Executive & {
  preferredName?: string;
  portraitPosition?: string;
  portraitFit?: "cover" | "contain";
};

export type Committee = {
  id: string;
  name: string;
  members: readonly CommitteeMember[];
};
