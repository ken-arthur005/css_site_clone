import type { Executive } from "@/types/executive";
import { HomeExecutiveGallery } from "./home-executive-gallery";

export function HomeExecutives({ executives }: { executives: readonly Executive[] }) {
  return (
    <section className="home-executives" aria-labelledby="executives-title">
      <div className="page-shell home-executives__content">
        <div className="home-section-heading">
          <div>
            <p className="eyebrow text-accent-strong">02 / Leadership</p>
            <h2 className="home-section-title" id="executives-title">The people moving CSS forward.</h2>
          </div>
          <p className="home-section-heading__note">Select a profile to expand it.</p>
        </div>
        <HomeExecutiveGallery executives={executives} />
      </div>
    </section>
  );
}
