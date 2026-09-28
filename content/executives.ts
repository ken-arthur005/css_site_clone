import type { Executive } from "@/types/executive";

export const executives = [
  {
    id: "exec-kane-nana-francis",
    slug: "kane-nana-francis",
    name: "Kane Nana Francis",
    role: "President",
    order: 1,
    contentStatus: "verified",
    portrait: {
      src: "/kane_president.png",
      alt: "Kane Nana Francis, President of CSS KNUST",
      contentStatus: "verified",
    },
  },
  {
    id: "exec-eliah-abormegah",
    slug: "eliah-abormegah",
    name: "Eliah Abormegah",
    role: "Vice President",
    order: 2,
    contentStatus: "verified",
    portrait: {
      src: "/eli_vicepres.png",
      alt: "Eliah Abormegah, Vice President of CSS KNUST",
      contentStatus: "verified",
    },
  },
  {
    id: "exec-carey-churchill-ken-arthur",
    slug: "carey-churchill-ken-arthur",
    name: "Carey Churchill Ken-Arthur",
    role: "Financial Secretary",
    order: 3,
    contentStatus: "verified",
    portrait: {
      src: "/carey_financialsec.png",
      alt: "Carey Churchill Ken-Arthur, Financial Secretary of CSS KNUST",
      contentStatus: "verified",
    },
  },
  {
    id: "exec-emmanuella",
    slug: "emmanuella",
    name: "Emmanuella",
    role: "General Secretary",
    order: 4,
    contentStatus: "verified",
  },
  {
    id: "exec-charles-kwame-bediakoh",
    slug: "charles-kwame-bediakoh",
    name: "Charles Kwame Bediakoh",
    role: "Organizing Secretary",
    order: 5,
    contentStatus: "verified",
  },
  {
    id: "exec-rosequeen-cudjoe",
    slug: "rosequeen-cudjoe",
    name: "RoseQueen Cudjoe",
    role: "Women's Commissioner",
    order: 6,
    contentStatus: "verified",
  },
] satisfies readonly Executive[];
