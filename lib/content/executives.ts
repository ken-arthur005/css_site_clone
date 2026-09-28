import { executives } from "@/content/executives";
import type { Executive } from "@/types/executive";

export async function getExecutives(): Promise<readonly Executive[]> {
  return [...executives].sort((first, second) => first.order - second.order);
}

export async function getExecutiveBySlug(slug: string): Promise<Executive | null> {
  return executives.find((executive) => executive.slug === slug) ?? null;
}
