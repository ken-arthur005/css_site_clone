import type { Metadata } from "next";
import { Fragment, type ReactNode } from "react";
import Image from "next/image";
import { AboutChapters } from "@/components/about/about-chapters";
import { AboutExperience } from "@/components/about/about-experience";
import { AboutFilm } from "@/components/about/about-film";
import { AboutOfficeGuide } from "@/components/about/about-office-guide";
import { AboutPhoto } from "@/components/about/about-photo";
import { AboutChampionSlideshow } from "@/components/about/about-champion-slideshow";
import { AboutTyping } from "@/components/about/about-typing";
import { TransitionLink } from "@/components/transitions/transition-link";
import { getAboutPopulation, getAboutStory } from "@/lib/content/about";
import { getExecutives } from "@/lib/content/executives";
import { getSiteInfo } from "@/lib/content/site";
import type { AboutHeading } from "@/types/about";
import "./about.css";

export async function generateMetadata(): Promise<Metadata> {
  const [story, site] = await Promise.all([getAboutStory(), getSiteInfo()]);
  const title = "Inside CSS — About the Computer Science Society, KNUST";
  const description = "Meet the people, explore CS and IT, discover student life, and find your way around the Computer Science Society at KNUST.";
  const canonical = site.canonicalOrigin.contentStatus === "verified" ? new URL("/about", site.canonicalOrigin.value).toString() : undefined;
  const shareImage = canonical ? new URL("/about/community/community.jpg", canonical).toString() : undefined;
  return {
    title, description,
    ...(canonical ? { alternates: { canonical } } : {}),
    robots: { index: story.contentStatus === "verified", follow: true },
    openGraph: { title, description, type: "website", ...(canonical ? { url: canonical } : {}), ...(shareImage ? { images: [{ url: shareImage, alt: "The CSS KNUST community" }] } : {}) },
    twitter: { card: shareImage ? "summary_large_image" : "summary", title, description, ...(shareImage ? { images: [shareImage] } : {}) },
  };
}

function ChapterLabel({ number, children }: { number: string; children: ReactNode }) {
  return <p className="about-label about-chapter-label"><span>{number} /</span>{children}<span className="about-chapter-label__line" aria-hidden="true" /></p>;
}

function Lines({ lines }: { lines?: readonly string[] }) {
  return lines?.map((line, index) => <Fragment key={line}>{line}{index < lines.length - 1 && <br />}</Fragment>);
}

function Headline({ heading, inlineLastLine = false }: { heading: AboutHeading; inlineLastLine?: boolean }) {
  const copy = <>{heading.lines.map((line, index) => <Fragment key={line}>{line}{inlineLastLine && index === heading.lines.length - 1 ? " " : <br />}</Fragment>)}<em>{heading.emphasis}</em></>;
  return heading.typeIn ? <AboutTyping>{copy}</AboutTyping> : copy;
}

export default async function AboutPage() {
  const [story, executives, site] = await Promise.all([getAboutStory(), getExecutives(), getSiteInfo()]);
  const photos = story.photos;
  const headings = story.headings;
  const population = Math.round(getAboutPopulation(story) / 10) * 10;
  const pending = story.contentStatus !== "verified";

  return (
    <main className="about-page" id="about-top" tabIndex={-1}>
      <AboutExperience>
        <AboutChapters chapters={story.chapters} />

        <section className="about-opening about-wrap" aria-labelledby="inside-css-title">
          <div className="about-opening__top"><p className="about-label">Computer Science Society / KNUST</p><p className="about-label">A field guide to your people</p></div>
          <h1 id="inside-css-title" className="about-opening__title"><span className="about-opening__line"><span>INSIDE</span></span><span className="about-opening__line about-opening__line--css"><span>CSS<span className="about-opening__dot">.</span></span></span></h1>
          <div className="about-opening__photo"><AboutPhoto photo={photos.opening} priority sizes="100vw" /><span className="about-opening__photo-index about-label">This is us. There’s room for you.</span><span className="about-cross about-cross--tl" aria-hidden="true" /><span className="about-cross about-cross--br" aria-hidden="true" /></div>
          <p className="about-opening__arrival" aria-hidden="true"><Headline heading={story.editorial.arrival} /></p>
          <div className="about-opening__note"><p>{story.editorial.coverNote}<br /><em>{story.editorial.coverAside}</em></p><div className="about-opening__actions"><a className="about-pill" href="#community">Enter the story <span aria-hidden="true">↓</span></a><a className="about-text-link" href="#office-guide">Need a hand? ↗</a></div></div>
          <div className="about-opening__bottom"><span className="about-label">Learn / Build / Belong</span><span className="about-label">Scroll to explore <span aria-hidden="true">↓</span></span></div>
        </section>

        {pending && <aside className="about-review about-wrap"><span className="about-label">Content preview</span><p>{story.reviewNote}</p></aside>}

        <section id="community" className="about-community about-section" tabIndex={-1} aria-labelledby="community-title">
          <div className="about-wrap">
            <ChapterLabel number="01">Our people</ChapterLabel>
            <div className="about-community__intro" data-about-reveal><h2 id="community-title" className="about-heading"><Headline heading={headings.community} /></h2><div className="about-community__copy"><p className="about-body-lg">{story.introduction}</p><p>{story.editorial.communityNote}</p><a className="about-text-link" href="#cohorts">Meet the year groups <span aria-hidden="true">↗</span></a></div></div>
            <div className="about-community__photos"><figure data-about-parallax><AboutPhoto photo={photos.jerseys} /><figcaption><span className="about-label">01 / Different colours</span><span>Same community.</span></figcaption></figure><figure data-about-parallax><AboutPhoto photo={photos.classroom} /><figcaption><span className="about-label">02 / Shared starting points</span><span>Plenty of possibilities.</span></figcaption></figure></div>
          </div>
          <div className="about-community__word" aria-hidden="true">YOU’RE ONE OF US.</div>
        </section>

        <section id="culture" className="about-culture about-section" tabIndex={-1} aria-labelledby="culture-title">
          <div className="about-wrap">
            <ChapterLabel number="02">The way we work</ChapterLabel>
            <div className="about-culture__heading" data-about-reveal><h2 id="culture-title" className="about-heading"><Headline heading={headings.culture} inlineLastLine /></h2><p><Lines lines={headings.culture.aside} /></p></div>
            <div className="about-culture__layout"><div className="about-culture__image" data-about-parallax><AboutPhoto photo={photos.culture} /><span className="about-image-tag about-label">A good question starts a conversation.</span></div><div className="about-principles">{story.principles.map((principle, index) => <article key={principle.title} data-about-reveal><span className="about-label">0{index + 1} /</span><div><h3>{principle.title}</h3><p className="about-aside">{principle.aside}</p><p>{principle.description}</p></div></article>)}</div></div>
          </div>
        </section>

        <section id="programmes" className="about-programmes about-section" tabIndex={-1} aria-labelledby="programmes-title">
          <div className="about-wrap">
            <ChapterLabel number="03">Two disciplines. One community.</ChapterLabel>
            <div className="about-programmes__heading" data-about-reveal><h2 id="programmes-title" className="about-heading"><Headline heading={headings.programmes} /></h2><p><Lines lines={headings.programmes.aside} /></p></div>
            <div className="about-convergence" aria-hidden="true"><div className="about-convergence__connection" /><span className="about-convergence__cs">CS</span><span className="about-convergence__it">IT</span><p className="about-convergence__shared">ONE COMMUNITY<span>Many ways to make a difference.</span></p><span className="about-convergence__corner about-label">BSc / Department of Computer Science</span></div>
            <div className="about-programme-pair">{story.programmes.map((programme) => <article key={programme.id} className="about-programme" data-about-reveal><span className="about-label">BSc / {programme.shortName}</span><h3>{programme.name}</h3><p className="about-programme__verb">{programme.verb}</p><p>{programme.description}</p><div className="about-programme__details"><h4 className="about-label">What you explore</h4><ul>{programme.subjects.map((subject) => <li key={subject}>{subject}</li>)}</ul><h4 className="about-label">Where it can lead</h4><p>{programme.careers.join(" · ")}</p></div></article>)}</div>
            <article id="faculty" className="about-faculty" tabIndex={-1} aria-labelledby="faculty-title"><div><p className="about-label">The people who help you go further</p><h3 id="faculty-title">{story.faculty.introduction}</h3></div><div><p>{story.faculty.description}</p><ul className="about-tags">{story.faculty.fields.map((field) => <li key={field}>{field}</li>)}</ul></div></article>
          </div>
        </section>

        <section id="cohorts" className="about-cohorts about-section" tabIndex={-1} aria-labelledby="cohorts-title">
          <div className="about-wrap">
            <ChapterLabel number="04">The cast of characters</ChapterLabel>
            <div className="about-cohorts__heading" data-about-reveal><h2 id="cohorts-title" className="about-heading"><Headline heading={headings.cohorts} /></h2><div className="about-cohorts__total"><span>~{population.toLocaleString("en-GB")}</span><p>students across the listed cohorts</p><small>Approximate {pending ? "· figures pending review" : ""}</small></div></div>
            <div className="about-cohort-list">{story.cohorts.map((cohort) => <article key={cohort.id} className="about-cohort" data-programme={cohort.programme}><div className="about-cohort__year"><span>{cohort.programme}</span><strong>{cohort.year}</strong></div><div className="about-cohort__copy"><h3>{cohort.title}</h3><p>{cohort.description}</p></div><p className="about-cohort__population"><span>~{cohort.population}</span><small>students</small></p></article>)}</div>
            <p className="about-footnote">{story.editorial.cohortNote}</p>
          </div>
        </section>

        <section id="building" className="about-building about-section" tabIndex={-1} aria-labelledby="building-title">
          <div className="about-wrap"><ChapterLabel number="05">Beyond the lecture slides</ChapterLabel><div className="about-building__heading" data-about-reveal><h2 id="building-title" className="about-heading"><Headline heading={headings.building} /></h2><p><Lines lines={headings.building.aside} /></p></div>
            <div className="about-initiatives">{story.initiatives.map((initiative, index) => <article key={initiative.title} className="about-initiative" data-about-reveal><figure data-about-parallax><AboutPhoto photo={photos[initiative.photo]} /><figcaption className="about-label">Field note / 0{index + 1}</figcaption></figure><div className="about-initiative__copy"><span className="about-label">0{index + 1} / Put it into practice</span><h3>{initiative.title}</h3><p className="about-aside">{initiative.aside}</p><p>{initiative.description}</p></div></article>)}</div>
            <div className="about-building__footer"><p>{story.editorial.buildingNote}</p><TransitionLink className="about-text-link" href="/events" transitionLabel="Events">Find a CSS event <span aria-hidden="true">↗</span></TransitionLink></div>
          </div>
        </section>

        <section id="sports" className="about-sports" tabIndex={-1} aria-labelledby="sports-title">
          <div className="about-sports__entrance"><div className="about-sports__backdrop" data-about-parallax><AboutPhoto photo={photos.sports} sizes="100vw" /></div><div className="about-wrap about-sports__cover"><ChapterLabel number="06">Outside the terminal</ChapterLabel><h2 id="sports-title" data-about-reveal><Headline heading={headings.sports} /></h2><div className="about-sports__cover-bottom"><p><Lines lines={headings.sports.aside} /></p><a href="#champions" className="about-pill">Meet the champions <span aria-hidden="true">↗</span></a></div></div></div>
          <div className="about-wrap about-sports__body"><div className="about-sports__intro" data-about-reveal><h3><Lines lines={story.editorial.sportsIntroduction} /></h3><div><p>{story.sports.description}</p><ul className="about-tags">{story.sports.disciplines.map((discipline) => <li key={discipline}>{discipline}</li>)}</ul></div></div>
            <div className="about-sports__film-row"><AboutFilm {...story.sports.video} /><div className="about-sports__film-aside"><span className="about-label">Team spirit, in motion</span><p><Headline heading={story.editorial.filmHeading} /></p><p>{story.editorial.filmDescription}</p></div></div>
            <div id="champions" className="about-champions" tabIndex={-1} aria-labelledby="champions-title"><div className="about-champions__feature"><div className="about-champions__photo"><AboutChampionSlideshow photos={story.sports.championGallery} /></div><div className="about-champions__headline"><span className="about-label">IT ’28 / Back-to-back champions</span><h3 id="champions-title"><Headline heading={headings.champions} /></h3><p><Lines lines={story.editorial.championNote} /></p></div></div><div className="about-honour"><div className="about-honour__heading"><h4>Roll of honour</h4><span className="about-label">{pending ? "Historic entries / pending review" : "CSS Games & tournaments"}</span></div>{story.sports.champions.map((champion) => <div className="about-honour__row" key={champion.competition}><span>{champion.competition}</span><strong>{champion.winner}</strong><span>{champion.note ?? ""}</span></div>)}</div></div>
          </div>
        </section>

        <section id="student-life" className="about-life about-section" tabIndex={-1} aria-labelledby="life-title"><div className="about-wrap"><p className="about-label">06 / The rest of the good stuff</p><div className="about-life__heading" data-about-reveal><h2 id="life-title" className="about-heading"><Headline heading={headings.life} /></h2><p><Lines lines={headings.life.aside} /></p></div><div className="about-life__moments">{story.life.map((moment, index) => <article key={moment.name} data-about-reveal><figure data-about-parallax><AboutPhoto photo={photos[moment.photo]} sizes="(max-width: 767px) 92vw, 33vw" /><figcaption className="about-label">Scene / 0{index + 1}</figcaption></figure><h3>{moment.name}</h3><p className="about-aside">{moment.aside}</p><p>{moment.description}</p></article>)}</div><p className="about-life__end"><Headline heading={story.editorial.lifeEnding} /></p></div></section>

        <section id="council" className="about-council about-section" tabIndex={-1} aria-labelledby="council-title"><div className="about-wrap"><ChapterLabel number="07">Your representatives / {story.council.session}</ChapterLabel><div className="about-council__heading" data-about-reveal><h2 id="council-title" className="about-heading"><Headline heading={headings.council} /></h2><div><p><Lines lines={headings.council.aside} /></p><TransitionLink className="about-text-link" href="/executives" transitionLabel="Executives">Explore the executive team <span aria-hidden="true">↗</span></TransitionLink></div></div><div className="about-council__members">{story.council.members.map((member, index) => { const executive = executives.find(({ id }) => id === member.executiveId); if (!executive) return null; return <article key={executive.id} className="about-representative"><div className="about-representative__portrait"><span className="about-label">0{index + 1} /</span>{executive.portrait ? <AboutPhoto photo={executive.portrait} hoverZoom={false} sizes="(max-width: 600px) 46vw, (max-width: 999px) 30vw, 18vw" /> : <span className="about-representative__initials" aria-hidden="true">{executive.name.split(" ").map((name) => name[0]).slice(0, 2).join("")}</span>}</div><p className="about-label">{executive.role}</p><h3>{executive.name}</h3><p className="about-representative__programme">{member.programme}</p></article>; })}</div></div></section>

        <section id="office-guide" className="about-offices about-section" tabIndex={-1} aria-labelledby="offices-title"><div className="about-wrap"><ChapterLabel number="08">Your department, decoded</ChapterLabel><div className="about-offices__heading" data-about-reveal><h2 id="offices-title" className="about-heading"><Headline heading={headings.offices} /></h2><p><Lines lines={headings.offices.aside} /></p></div>{pending && <p className="about-guide-review">Office locations and procedures are draft guidance from the supplied department notes; confirm current details with the department.</p>}<AboutOfficeGuide offices={story.offices} topics={story.helpTopics} />
          <noscript>
            <style>{".about-help { display: none; }"}</style>
            <div className="about-help-static">
              <h3>Quick reference: where should I go?</h3>
              {story.helpTopics.map((topic) => (
                <details className="about-office" key={topic.id}>
                  <summary>{topic.label}</summary>
                  <div className="about-office__details">
                    <ol>{topic.steps.map((step) => <li key={step}>{step}</li>)}</ol>
                    <p>{topic.note}</p>
                  </div>
                </details>
              ))}
            </div>
          </noscript>
          <div className="about-office-directory"><div className="about-office-directory__photo" data-about-parallax><AboutPhoto photo={photos.department} /><span className="about-image-tag about-label">Department of Computer Science / KNUST</span></div><div><p className="about-label about-office-directory__label">The office directory</p>{story.offices.map((office) => <details id={`office-${office.id}`} key={office.id} className="about-office" tabIndex={-1}><summary><span className="about-office__room">{office.room}</span><span><strong>{office.name}</strong><small>{office.location}</small></span><span className="about-office__expand" aria-hidden="true">+</span></summary><div className="about-office__details"><p>{office.description}</p><h3 className="about-label">When to visit</h3><ul>{office.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></div></details>)}</div></div>
          <div id="find-us" className="about-find-us" tabIndex={-1} aria-labelledby="find-us-title"><div><p className="about-label">The story continues</p><h3 id="find-us-title"><Headline heading={headings.findUs} /></h3><p>{story.contact.location}</p></div><div className="about-find-us__contact"><Image src="/css_logo.svg" width={130} height={68} alt="Computer Science Society" /><p className="about-label">Find your people / {story.contact.handle}</p><div className="about-find-us__socials">{site.socials.map((social) => <a key={social.platform} href={social.url} target="_blank" rel="noreferrer">{social.platform} ↗</a>)}</div>{pending ? <details className="about-contact-draft"><summary>Contact details awaiting approval</summary>{story.contact.emails.map((email) => <p key={email}>{email}</p>)}</details> : story.contact.emails.map((email) => <a href={`mailto:${email}`} key={email}>{email}</a>)}<a className="about-text-link" href="#about-top">Back to the opening <span aria-hidden="true">↑</span></a></div></div>
        </div></section>
      </AboutExperience>
    </main>
  );
}
