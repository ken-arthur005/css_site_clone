import { HomeAboutExperience } from "./home-about-experience";
import { getHomeAboutContent } from "@/lib/content/home";

export async function HomeAbout() {
  const content = await getHomeAboutContent();
  return <HomeAboutExperience content={content} />;
}
