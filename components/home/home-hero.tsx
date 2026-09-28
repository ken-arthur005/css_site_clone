import type { SiteInfo } from "@/types/site";
import { HeroIdentityCard } from "./hero-identity-card";
import { HeroTechField } from "./hero-tech-field";

export function HomeHero({ site }: { site: SiteInfo }) {
  return (
    <section className="home-hero" aria-labelledby="home-title">
      <HeroTechField />

      <div className="page-shell home-hero__inner">
        <h1 className="home-hero__title" id="home-title">
          <span>THINK.</span>
          <span>BUILD.</span>
          <span>BECOME<span className="home-hero__title-period">.</span></span>
        </h1>
        <HeroIdentityCard site={site} />
      </div>
    </section>
  );
}
