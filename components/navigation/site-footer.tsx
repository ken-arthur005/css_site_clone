import { TransitionLink } from "@/components/transitions/transition-link";

const navigation = [
  { href: "/about", label: "About" },
  { href: "/executives", label: "Executives" },
  { href: "/events", label: "Events" },
  { href: "/merch", label: "Merch" },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner page-shell">
        <div className="site-footer__identity">
          <p className="eyebrow">Computer Science Society</p>
          <p className="site-footer__statement">CSS KNUST</p>
        </div>

        <nav aria-label="Footer navigation" className="site-footer__nav">
          <p className="eyebrow">Explore</p>
          {navigation.map((item) => (
            <TransitionLink href={item.href} key={item.href} transitionLabel={item.label}>
              {item.label}
            </TransitionLink>
          ))}
        </nav>

        <div className="site-footer__context">
          <p className="eyebrow">Institutional context</p>
          <p>KNUST, College of Science</p>
          <p>Kumasi, Ghana</p>
        </div>

        <p className="site-footer__copyright">
          © {new Date().getFullYear()} Computer Science Society, KNUST
        </p>
      </div>
    </footer>
  );
}
