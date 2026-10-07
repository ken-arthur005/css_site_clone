import { homeAboutContent } from "@/content/home";
import type { HomeAboutContent } from "@/types/home";

export async function getHomeAboutContent(): Promise<HomeAboutContent> {
  return homeAboutContent;
}
