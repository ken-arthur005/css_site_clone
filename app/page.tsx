import { HomeAbout } from "@/components/home/home-about";
import { HomeEvents } from "@/components/home/home-events";
import { HomeExecutives } from "@/components/home/home-executives";
import { HomeHero } from "@/components/home/home-hero";
import { HomeMerch } from "@/components/home/home-merch";
import { HomeQuoteBridge } from "@/components/home/home-quote-bridge";
import { getExecutives } from "@/lib/content/executives";
import { getHomeEventSelection } from "@/lib/content/events";
import { getFeaturedMerchProducts } from "@/lib/content/merch";
import { getSiteInfo } from "@/lib/content/site";
import { getHomeLoadingPlan } from "@/lib/content/loading";
import { getHomeQuotes } from "@/lib/content/home";

// Request-driven ISR: refresh date-sensitive selection after one hour.
export const revalidate = 3600;

export default async function Home() {
  const [site, executives, eventSelection, featuredProducts, quotes] = await Promise.all([
    getSiteInfo(),
    getExecutives(),
    getHomeEventSelection(),
    getFeaturedMerchProducts(),
    getHomeQuotes(),
  ]);
  const loadingPlan = await getHomeLoadingPlan(featuredProducts[0]);

  return (
    <main>
      <HomeHero site={site} loadingPlan={loadingPlan} />
      <HomeAbout />
      <HomeExecutives executives={executives} />
      <HomeQuoteBridge {...quotes.leadership} />
      <HomeEvents selection={eventSelection} exitQuote={quotes.events} />
      <HomeMerch product={featuredProducts[0] ?? null} />
    </main>
  );
}
