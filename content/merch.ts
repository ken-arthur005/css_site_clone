import type { Color } from "@/types/content";
import type { MerchProduct } from "@/types/merch";

const black: Color = { id: "black", name: "Black", value: "#17191f" };
const white: Color = { id: "white", name: "White", value: "#f5f5f0" };
const pink: Color = { id: "pink", name: "Pink", value: "#f09ab5" };
const blue: Color = { id: "blue", name: "Blue", value: "#6d95df" };

// Development-only product and colourway records. Inventory and prices require approval.
export const merchProducts = [
  {
    id: "product-css-core-tee",
    slug: "css-core-tee",
    name: "css tshirt",
    description: "Development placeholder for the first CSS KNUST apparel product.",
    contentStatus: "placeholder",
    price: { contentStatus: "placeholder" },
    featured: true,
    model: {
      src: "/css_shirt_3dmodel/models/css_shirt.web.glb",
      alt: "Interactive 3D CSS tshirt",
      contentStatus: "verified",
    },
    variants: [
      {
        id: "css-core-tee-black-white",
        baseColor: black,
        printColor: white,
        availability: "unknown",
        texture: {
          src: "/css_shirt_3dmodel/merch/textures/css%20shirt%20white%20on%20black.png",
          alt: "Black CSS tshirt with white print texture",
          contentStatus: "verified",
        },
        fallbackImage: {
          src: "/css_shirt_3dmodel/merch/static%20renders/black_on_white.png",
          alt: "Black CSS tshirt with white print",
          contentStatus: "verified",
        },
      },
      {
        id: "css-core-tee-black-pink",
        baseColor: black,
        printColor: pink,
        availability: "unknown",
        texture: {
          src: "/css_shirt_3dmodel/merch/textures/css%20shirt%20pink%20on%20black.png",
          alt: "Black CSS tshirt with pink print texture",
          contentStatus: "verified",
        },
        fallbackImage: {
          src: "/css_shirt_3dmodel/merch/static%20renders/black_on_pink.png",
          alt: "Black CSS tshirt with pink print",
          contentStatus: "verified",
        },
      },
      {
        id: "css-core-tee-white-black",
        baseColor: white,
        printColor: black,
        availability: "unknown",
        texture: {
          src: "/css_shirt_3dmodel/merch/textures/css%20shirt%20black%20on%20white.png",
          alt: "White CSS tshirt with black print texture",
          contentStatus: "verified",
        },
        fallbackImage: {
          src: "/css_shirt_3dmodel/merch/static%20renders/white_on_black.png",
          alt: "White CSS tshirt with black print",
          contentStatus: "verified",
        },
      },
      {
        id: "css-core-tee-white-blue",
        baseColor: white,
        printColor: blue,
        availability: "unknown",
        texture: {
          src: "/css_shirt_3dmodel/merch/textures/css%20shirt%20blue%20on%20white.png",
          alt: "White CSS tshirt with blue print texture",
          contentStatus: "verified",
        },
        fallbackImage: {
          src: "/css_shirt_3dmodel/merch/static%20renders/white_on_blue.png",
          alt: "White CSS tshirt with blue print",
          contentStatus: "verified",
        },
      },
      {
        id: "css-core-tee-blue-white",
        baseColor: blue,
        printColor: white,
        availability: "unknown",
        texture: {
          src: "/css_shirt_3dmodel/merch/textures/css%20shirt%20white%20on%20blue.png",
          alt: "Blue CSS tshirt with white print texture",
          contentStatus: "verified",
        },
        fallbackImage: {
          src: "/css_shirt_3dmodel/merch/static%20renders/blue_on_white.png",
          alt: "Blue CSS tshirt with white print",
          contentStatus: "verified",
        },
      },
      {
        id: "css-core-tee-pink-white",
        baseColor: pink,
        printColor: white,
        availability: "unknown",
        texture: {
          src: "/css_shirt_3dmodel/merch/textures/css%20shirt%20white%20on%20pink.png",
          alt: "Pink CSS tshirt with white print texture",
          contentStatus: "verified",
        },
        fallbackImage: {
          src: "/css_shirt_3dmodel/merch/static%20renders/pink_on_white.png",
          alt: "Pink CSS tshirt with white print",
          contentStatus: "verified",
        },
      },
    ],
  },
] satisfies readonly MerchProduct[];
