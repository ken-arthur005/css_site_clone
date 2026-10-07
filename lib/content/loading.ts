import { getImageProps } from "next/image";
import { loadingJokes } from "@/content/loading";
import { getAboutStory } from "./about";
import { getAdministration } from "./committees";
import { getEvents } from "./events";
import type { MerchProduct } from "@/types/merch";
import type { HomeLoadingPlan, LoadingImage } from "@/types/loading";

function image(src: string, sizes: string): LoadingImage {
  const { props } = getImageProps({ src, alt: "", fill: true, sizes });
  return { src: props.src, srcSet: props.srcSet, sizes: props.sizes };
}

export async function getHomeLoadingPlan(product?: MerchProduct): Promise<HomeLoadingPlan> {
  const [about, administration, events] = await Promise.all([
    getAboutStory(), getAdministration(), getEvents(),
  ]);
  const merchImages = product?.variants.map((variant) =>
    image(variant.fallbackImage.src, "(max-width: 767px) 100vw, 80vw"),
  ) ?? [];

  return {
    jokes: loadingJokes.lines,
    extraImages: [
      ...merchImages,
      ...["/css_logo-nobg.png", "/albert_president.png", "/homecoming.jpg", "/tshirt white-black.png"]
        .map((src) => image(src, "28rem")),
    ],
    resources: [
      { src: "/CSS%20Logo%203d.glb", kind: "model" },
      { src: "/gaming_mouse_-_free_low_poly.glb", kind: "model" },
      ...(product?.model ? [{ src: product.model.src, kind: "model" as const, draco: false }] : []),
      ...(product?.variants.map((variant) => ({ src: variant.texture.src, kind: "texture" as const })) ?? []),
    ],
    background: [
      {
        href: "/about",
        images: [...Object.values(about.photos), ...about.sports.championGallery, { src: about.sports.video.poster }]
          .map((photo) => image(photo.src, "(max-width: 767px) 92vw, 50vw")),
        files: [about.sports.video.src],
      },
      {
        href: "/executives",
        images: [
          image("/cos_landscape.jpeg", "100vw"),
          image("/CSS267.png", "(max-width: 600px) 140px, 240px"),
          ...administration.flatMap((committee) => committee.members.flatMap((member) =>
            member.portrait ? [image(member.portrait.src, "(min-width: 1100px) 25vw, (min-width: 600px) 50vw, 100vw")] : [],
          )),
        ],
      },
      { href: "/events", images: [] },
      { href: "/merch", images: merchImages },
      ...events.map((event) => ({
        href: `/events/${event.slug}`,
        images: [event.heroImage, event.flyer, ...(event.gallery ?? [])]
          .flatMap((asset) => asset ? [image(asset.src, "100vw")] : []),
      })),
    ],
  };
}
