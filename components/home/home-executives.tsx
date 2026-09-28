import type { Executive } from "@/types/executive";
import { HomeExecutiveGallery } from "./home-executive-gallery";
import { LeadershipArrival } from "./leadership-arrival";

export function HomeExecutives({ executives }: { executives: readonly Executive[] }) {
  return (
    <section className="home-executives" aria-labelledby="executives-title">
      <LeadershipArrival>
        <HomeExecutiveGallery executives={executives} />
      </LeadershipArrival>
    </section>
  );
}
