import { aboutStory } from "@/content/about";
import type { AboutStory } from "@/types/about";

export async function getAboutStory(): Promise<AboutStory> {
  return aboutStory;
}

export function getAboutPopulation(story: Pick<AboutStory, "cohorts">): number {
  return story.cohorts.reduce((total, cohort) => total + cohort.population, 0);
}
