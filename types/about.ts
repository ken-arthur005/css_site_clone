import type { ContentStatus } from "./content";

export type AboutPhoto = { src: string; alt: string; position?: string };
export type AboutChapter = { id: string; label: string; number: string; description: string };
export type AboutCohort = { id: string; programme: "CS" | "IT"; year: number; population: number; title: string; description: string };
export type AboutProgramme = { id: string; shortName: string; name: string; verb: string; description: string; subjects: readonly string[]; careers: readonly string[] };
export type AboutOffice = { id: string; name: string; room: string; location: string; description: string; reasons: readonly string[] };
export type AboutHelpTopic = { id: string; label: string; officeId: string; steps: readonly string[]; note: string };
export type AboutHeading = { lines: readonly string[]; emphasis: string; aside?: readonly string[] };
export type AboutStory = {
  contentStatus: ContentStatus;
  reviewNote: string;
  title: string;
  introduction: string;
  headings: Record<"community" | "culture" | "programmes" | "cohorts" | "building" | "sports" | "life" | "council" | "offices" | "champions" | "findUs", AboutHeading>;
  editorial: {
    coverNote: string; coverAside: string; arrival: AboutHeading;
    communityNote: string; buildingNote: string; cohortNote: string;
    sportsIntroduction: readonly string[]; filmHeading: AboutHeading; filmDescription: string;
    championNote: readonly string[]; lifeEnding: AboutHeading;
  };
  chapters: readonly AboutChapter[];
  photos: Record<string, AboutPhoto>;
  principles: readonly { title: string; aside: string; description: string }[];
  programmes: readonly AboutProgramme[];
  faculty: { introduction: string; description: string; fields: readonly string[] };
  cohorts: readonly AboutCohort[];
  initiatives: readonly { title: string; aside: string; description: string; photo: string }[];
  sports: { description: string; disciplines: readonly string[]; video: { src: string; poster: string; title: string }; champions: readonly { competition: string; winner: string; note?: string }[] };
  life: readonly { name: string; aside: string; photo: string; description: string }[];
  council: { session: string; members: readonly { executiveId: string; programme: string }[] };
  offices: readonly AboutOffice[];
  helpTopics: readonly AboutHelpTopic[];
  contact: { location: string; emails: readonly string[]; handle: string };
};
