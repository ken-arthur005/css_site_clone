import type { Executive } from "@/types/executive";
import { HomeExecutiveGallery } from "./home-executive-gallery";
import { LeadershipArrival } from "./leadership-arrival";
import { LeadershipMousePass } from "./leadership-mouse-pass";

export function HomeExecutives({ executives }: { executives: readonly Executive[] }) {
  return (
    <div className="home-leadership">
      <section className="home-executives" aria-labelledby="executives-title">
        <LeadershipArrival>
          <HomeExecutiveGallery executives={executives} />
        </LeadershipArrival>
      </section>
      <LeadershipMousePass />
    </div>
  );
}
