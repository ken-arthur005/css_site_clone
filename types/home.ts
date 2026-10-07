export type HomeCommunityPhoto = {
  id: string;
  src: string;
  position?: string;
};

export type HomeAboutContent = {
  headingLines: readonly string[];
  communityPhotos: readonly HomeCommunityPhoto[];
  careerPaths: readonly HomeCareerPath[];
  terminal: HomeTerminalContent;
};

export type HomeCareerPath = {
  id: string;
  name: string;
  description: string;
};

export type HomeTerminalContent = {
  title: string;
  prompt: string;
  command: string;
};
