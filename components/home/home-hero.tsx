import Image from "next/image";
import type { SiteInfo } from "@/types/site";

const techSymbols = [
  { file: "python-fill.svg", label: "Python" },
  { file: "react.svg", label: "React" },
  { file: "docker.svg", label: "Docker" },
  { file: "terminal.svg", label: "Terminal" },
  { file: "github.svg", label: "GitHub" },
  { file: "figma-bold.svg", label: "Figma" },
  { file: "js.svg", label: "JavaScript" },
  { file: "linux-outlined.svg", label: "Linux" },
  { file: "vscode-fill.svg", label: "VS Code" },
  { file: "openai-chatgpt.svg", label: "AI" },
  { file: "git.svg", label: "Git" },
  { file: "aws-solid.svg", label: "Cloud" },
];

export function HomeHero({ site }: { site: SiteInfo }) {
  return (
    <section className="home-hero" aria-labelledby="home-title">
      <div className="home-hero__collage" aria-hidden="true">
        {techSymbols.map((symbol, index) => (
          <Image
            alt=""
            className={`home-hero__symbol home-hero__symbol--${index + 1}`}
            height={64}
            key={symbol.file}
            src={`/tech_icons/${symbol.file}`}
            width={64}
          />
        ))}
      </div>

      <div className="page-shell home-hero__inner">
        <p className="eyebrow home-hero__eyebrow">CSS KNUST / College of Science</p>
        <h1 className="home-hero__title" id="home-title">
          <span>WE BUILD</span>
          <span>WHAT&apos;S NEXT.</span>
        </h1>
        <aside className="home-hero__identity angular-cut" aria-label="Institutional identity">
          <p className="eyebrow">Institutional identity</p>
          <p className="home-hero__identity-name">{site.name}</p>
          <p>{site.institution}</p>
          <p>{site.college}</p>
          <p>{site.location}</p>
        </aside>
      </div>
    </section>
  );
}
