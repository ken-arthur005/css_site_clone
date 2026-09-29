import { events } from "@/content/events";
import { executives } from "@/content/executives";
import { merchProducts } from "@/content/merch";

type HomeImagePreload = {
  src: string;
  sizes: string;
};

const communityImages: readonly HomeImagePreload[] = [
  { src: "/this%20is%20css/REP%20YOUR%20JERSEY-9.jpg", sizes: "(max-width: 767px) 34vw, 16vw" },
  { src: "/this%20is%20css/WhatsApp%20Image%202026-09-28%20at%201.43.19%20PM.jpeg", sizes: "(max-width: 767px) 34vw, 16vw" },
  { src: "/this%20is%20css/REP%20YOUR%20JERSEY-5.jpg", sizes: "(max-width: 767px) 34vw, 16vw" },
  { src: "/this%20is%20css/WhatsApp%20Image%202026-09-28%20at%201.41.30%20PM.jpeg", sizes: "(max-width: 767px) 34vw, 16vw" },
  { src: "/this%20is%20css/WhatsApp%20Image%202026-09-28%20at%201.41.30%20PM%20(1).jpeg", sizes: "(max-width: 767px) 34vw, 16vw" },
];

const heroTechIcons: readonly HomeImagePreload[] = [
  "python-fill.svg", "react.svg", "docker.svg", "terminal.svg", "github.svg", "figma-bold.svg",
  "js.svg", "linux-outlined.svg", "vscode-fill.svg", "openai-chatgpt.svg", "git.svg", "aws-solid.svg",
].map((file) => ({ src: `/tech_icons/${file}`, sizes: "128px" }));

const featuredProduct = merchProducts.find((product) => product.featured);

export const homeImagePreloads: readonly HomeImagePreload[] = [
  { src: "/css_logo.svg", sizes: "42px" },
  { src: "/267.svg", sizes: "256px" },
  ...heroTechIcons,
  ...communityImages,
  ...executives.flatMap((executive) => executive.portrait ? [{ src: executive.portrait.src, sizes: "(max-width: 767px) 100vw, 58vw" }] : []),
  { src: "/event1.jpg", sizes: "(max-width: 768px) 100vw, min(100vw - 7rem, 1280px)" },
  { src: "/Knust%20entrance.jpg", sizes: "100vw" },
  ...events.flatMap((event) => event.heroImage ? [{ src: event.heroImage.src, sizes: "(max-width: 767px) 82vw, 54vw" }] : []),
  ...(featuredProduct?.variants.flatMap((variant) => [{ src: variant.fallbackImage.src, sizes: "(max-width: 767px) 100vw, 80vw" }]) ?? []),
  { src: "/css_logo-nobg.png", sizes: "28rem" },
  { src: "/tshirt%20white-black.png", sizes: "28rem" },
];

export const homeModelSources: readonly string[] = [
  "/CSS%20Logo%203d.glb",
  "/gaming_mouse_-_free_low_poly.glb",
  ...(featuredProduct?.model ? [featuredProduct.model.src] : []),
];

export const homeTextureSources: readonly string[] = featuredProduct?.variants.map((variant) => variant.texture.src) ?? [];
