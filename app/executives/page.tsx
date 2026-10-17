import type { Metadata } from "next";
import Image from "next/image";
import { AdministrationHero } from "@/components/executives/administration-hero";
import { CommitteeNavigation } from "@/components/executives/committee-navigation";
import { PersonCard } from "@/components/executives/person-card";
import { getAdministration } from "@/lib/content/committees";
import { getPageMetadata } from "@/lib/seo";
import "./executives.css";

export async function generateMetadata(): Promise<Metadata> {
  return getPageMetadata({
    title: "Executives & Committees | CSS KNUST — 2026/27",
    description: "Meet the executives and committee members of the 2026/27 Computer Science Society administration at KNUST.",
    path: "/executives",
    image: { src: "/cos_landscape.jpeg", alt: "College of Science, KNUST" },
  });
}

export default async function ExecutivesPage() {
  const administration = await getAdministration();
  const sections = administration.map(({ id, name }) => ({ id, name }));

  return (
    <main className="executives-page" id="administration-top" tabIndex={-1}>
      <AdministrationHero />
      <div className="administration-directory" id="administration-directory">
        <div className="administration-directory__intro">
          <div>
            <p className="administration-label">The 2026/27 administration</p>
            <h2>Meet your executives<span className="administration-directory__dot">.</span></h2>
          </div>
          <Image className="administration-directory__logo" src="/CSS267.png" width={727} height={269} alt="CSS 2026/27" sizes="(max-width: 600px) 140px, 240px" />
        </div>

        <CommitteeNavigation sections={sections} />

        <div className="administration-sections">
          {administration.map((committee, index) => (
            <section className="administration-committee" id={committee.id} key={committee.id} aria-labelledby={`${committee.id}-title`} tabIndex={-1}>
              <div className="administration-committee__heading">
                <p className="administration-label">{String(index + 1).padStart(2, "0")} / {committee.id === "executives" ? "The executive team" : "Committee"}</p>
                <h2 id={`${committee.id}-title`}>{committee.name}</h2>
              </div>
              <div className="administration-grid">
                {committee.members.map((member) => <PersonCard key={member.id} member={member} />)}
              </div>
            </section>
          ))}
        </div>

        <div className="administration-directory__end">
          <p className="administration-label">Computer Science Society / KNUST</p>
          <a href="#administration-directory">Back to committees <span aria-hidden="true">↑</span></a>
        </div>
      </div>
      <noscript><style>{`.person-card__details { grid-template-rows: 1fr; visibility: visible; opacity: 1; } .person-card__toggle { display: none; } .person-card__body { margin-bottom: 1.5rem; }`}</style></noscript>
    </main>
  );
}
