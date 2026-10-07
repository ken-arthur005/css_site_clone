export type HomeCommunityPhoto = {
  id: string;
  src: string;
  position?: string;
};

export type HomeAboutContent = {
  headingLines: readonly string[];
  communityPhotos: readonly HomeCommunityPhoto[];
  careerPaths: readonly string[];
};
