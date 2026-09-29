import { HomeAbout } from "@/components/home/home-about";
import { HomeEvents } from "@/components/home/home-events";
import { HomeExecutives } from "@/components/home/home-executives";
import { HomeHero } from "@/components/home/home-hero";
import { LeadershipMousePass } from "@/components/home/leadership-mouse-pass";
import { HomeMerch } from "@/components/home/home-merch";
import { HomeQuoteBridge } from "@/components/home/home-quote-bridge";
import { getExecutives } from "@/lib/content/executives";
import { getFeaturedEvents, getUpcomingEvents } from "@/lib/content/events";
import { getFeaturedMerchProducts } from "@/lib/content/merch";
import { getSiteInfo } from "@/lib/content/site";

export default async function Home() {
  const [site, executives, featuredEvents, upcomingEvents, featuredProducts] = await Promise.all([
    getSiteInfo(),
    getExecutives(),
    getFeaturedEvents(),
    getUpcomingEvents(),
    getFeaturedMerchProducts(),
  ]);
  const selectedEvents = [...featuredEvents, ...upcomingEvents].filter(
    (event, index, events) => events.findIndex(({ id }) => id === event.id) === index,
  );

  return (
    <main>
      <HomeHero site={site} />
      <HomeAbout />
      <LeadershipMousePass />
      <HomeExecutives executives={executives} />
      <HomeQuoteBridge author="Linus Torvalds" quote="Talk is cheap. Show me the code." />
      <HomeEvents events={selectedEvents} />
      <HomeMerch product={featuredProducts[0] ?? null} />
    </main>
  );
}
