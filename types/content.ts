export type ContentStatus = "placeholder" | "verified";

export type ContentAsset = {
  src: string;
  alt: string;
  contentStatus: ContentStatus;
};

export type Color = {
  id: string;
  name: string;
  value: string;
};
