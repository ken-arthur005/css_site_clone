import Image from "next/image";
import { TransitionLink } from "@/components/transitions/transition-link";

const disciplines = [
  "Software Engineering",
  "Cybersecurity",
  "Artificial Intelligence",
  "Data",
  "UI / UX",
  "Cloud",
  "Game Development",
  "Research",
];

export function HomeAbout() {
  return (
    <section className="home-about" aria-labelledby="about-title">
      <div className="page-shell">
        <div className="home-about__intro">
          <div>
            <p className="eyebrow text-accent-strong">01 / About CSS</p>
            <h2 className="home-section-title" id="about-title">
              A society shaped by computing.
            </h2>
          </div>
          <div className="home-about__copy">
            <p className="editorial-type">
              Computer Science Society, KNUST brings the people, perspectives and
              disciplines around computing into one shared space.
            </p>
            <TransitionLink className="button button-secondary angular-cut" href="/about" transitionLabel="ABOUT">
              About CSS <span aria-hidden="true">/&gt;</span>
            </TransitionLink>
          </div>
        </div>

        <div className="home-about__field">
          <ul className="home-about__disciplines" aria-label="Computing disciplines">
            {disciplines.map((discipline, index) => (
              <li className={`home-about__discipline home-about__discipline--${index + 1}`} key={discipline}>
                {discipline}
              </li>
            ))}
          </ul>
          <div className="home-about__mark angular-cut">
            <Image alt="CSS KNUST logo" height={192} priority={false} src="/css_logo.svg" width={370} />
          </div>
          <p className="home-about__field-label eyebrow">The computing field</p>
        </div>
      </div>
    </section>
  );
}
