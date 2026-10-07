export type LoadingImage = { src: string; srcSet?: string; sizes?: string };
export type LoadingResource = { src: string; kind: "model" | "texture"; draco?: boolean };
export type BackgroundRouteAssets = {
  href: string;
  images: readonly LoadingImage[];
  files?: readonly string[];
};
export type HomeLoadingPlan = {
  extraImages: readonly LoadingImage[];
  resources: readonly LoadingResource[];
  background: readonly BackgroundRouteAssets[];
  jokes: readonly string[];
};
