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
    name: "CSS Core Tee",
    description: "Development placeholder for the first CSS KNUST apparel product.",
    contentStatus: "placeholder",
    price: { contentStatus: "placeholder" },
    featured: true,
    variants: [
      {
        id: "css-core-tee-black-white",
        baseColor: black,
        printColor: white,
        availability: "unknown",
      },
      {
        id: "css-core-tee-black-pink",
        baseColor: black,
        printColor: pink,
        availability: "unknown",
      },
      {
        id: "css-core-tee-white-black",
        baseColor: white,
        printColor: black,
        availability: "unknown",
      },
      {
        id: "css-core-tee-white-blue",
        baseColor: white,
        printColor: blue,
        availability: "unknown",
      },
      {
        id: "css-core-tee-blue-white",
        baseColor: blue,
        printColor: white,
        availability: "unknown",
      },
    ],
  },
] satisfies readonly MerchProduct[];
