import { HomeAbout } from "@/components/home/home-about";
import { HomeEvents } from "@/components/home/home-events";
import { HomeExecutives } from "@/components/home/home-executives";
import { HomeHero } from "@/components/home/home-hero";
import { LeadershipMousePass } from "@/components/home/leadership-mouse-pass";
import { HomeMerch } from "@/components/home/home-merch";
import { HomeQuoteBridge } from "@/components/home/home-quote-bridge";
import { getExecutives } from "@/lib/content/executives";
import { getHomeEventSelection } from "@/lib/content/events";
import { getFeaturedMerchProducts } from "@/lib/content/merch";
import { getSiteInfo } from "@/lib/content/site";

// Request-driven ISR: refresh date-sensitive selection after one hour.
export const revalidate = 3600;

export default async function Home() {
  const [site, executives, eventSelection, featuredProducts] = await Promise.all([
    getSiteInfo(),
    getExecutives(),
    getHomeEventSelection(),
    getFeaturedMerchProducts(),
  ]);

  return (
    <main>
      <HomeHero site={site} />
      <HomeAbout />
      <LeadershipMousePass />
      <HomeExecutives executives={executives} />
      <HomeQuoteBridge author="Linus Torvalds" quote="Talk is cheap. Show me the code." />
      <HomeEvents selection={eventSelection} />
      <HomeQuoteBridge author="Steve Jobs" quote="Everybody in this country should learn how to program a computer, because it teaches you how to think." />
      <HomeMerch product={featuredProducts[0] ?? null} />
    </main>
  );
}
