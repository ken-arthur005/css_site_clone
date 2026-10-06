"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { siteInfo } from "@/content/site";
import { TransitionLink } from "@/components/transitions/transition-link";
import { FooterLogoScene } from "./footer-logo-scene";
import { FooterArrival } from "./footer-arrival";

const navigation = [
  { href: "/about", label: "About", image: "/css_logo-nobg.png", imageClass: "site-footer__preview-image--about" },
  { href: "/executives", label: "Executives", image: "/albert_president.png", imageClass: "site-footer__preview-image--executives" },
  { href: "/events", label: "Events", image: "/homecoming.jpg", imageClass: "site-footer__preview-image--events" },
  { href: "/merch", label: "Merch", image: "/tshirt white-black.png", imageClass: "site-footer__preview-image--merch" },
];

function SocialIcon({ platform }: { platform: string }) {
  if (platform === "Instagram") return <svg aria-hidden="true" viewBox="0 0 24 24"><rect height="17" rx="5" width="17" x="3.5" y="3.5" /><circle cx="12" cy="12" r="4" /><circle className="site-footer__social-dot" cx="17.3" cy="6.9" r="1" /></svg>;
  if (platform === "TikTok") return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M15.7 3.5v10.8a4.6 4.6 0 1 1-4-4.55v3.05a1.6 1.6 0 1 0 1 1.5V3.5h3a4.4 4.4 0 0 0 4.3 4.1v3a7.3 7.3 0 0 1-4.3-1.4" /></svg>;
  if (platform === "X") return <Image alt="" className="site-footer__supplied-social-icon" height={18} src="/social_media/x-solid.svg" width={18} />;
  return <Image alt="" className="site-footer__supplied-social-icon" height={18} src="/social_media/youtube-filled.svg" width={18} />;
}

export function SiteFooter() {
  const [activeItem, setActiveItem] = useState<(typeof navigation)[number] | null>(null);
  const footerRef = useRef<HTMLElement>(null);

  return (
    <footer className="site-footer" ref={footerRef}>
      <FooterArrival footerRef={footerRef} />
      <div className="site-footer__frame page-shell">
        <section className="site-footer__mark" aria-label="Computer Science Society, KNUST">
          <p className="site-footer__label">Computer Science<br />Society</p>
          <FooterLogoScene />
          <p className="site-footer__location">KNUST / College of Science<br />Kumasi, Ghana</p>
        </section>

        <div className="site-footer__explore">
          <p className="site-footer__eyebrow">Explore CSS</p>
          <nav aria-label="Footer navigation" className="site-footer__nav" onMouseLeave={() => setActiveItem(null)}>
            {navigation.map((item, index) => (
              <TransitionLink
                aria-describedby={activeItem?.href === item.href ? "footer-preview-description" : undefined}
                href={item.href}
                key={item.href}
                onFocus={() => setActiveItem(item)}
                onMouseEnter={() => setActiveItem(item)}
                transitionLabel={item.label}
              >
                <span className="site-footer__nav-index">0{index + 1}</span>
                <span>{item.label}</span>
                <span aria-hidden="true" className="site-footer__nav-arrow">↗</span>
                {activeItem?.href === item.href ? (
                  <span aria-hidden="true" className="site-footer__nav-preview">
                    <Image alt="" className={`site-footer__preview-image ${item.imageClass}`} fill sizes="28rem" src={item.image} />
                  </span>
                ) : null}
              </TransitionLink>
            ))}
          </nav>
          <span className="sr-only" id="footer-preview-description">A visual preview accompanies the focused destination.</span>

        </div>

        <div className="site-footer__base">
          <p>© {new Date().getFullYear()} Computer Science Society, KNUST</p>
          <div aria-label="CSS KNUST social media" className="site-footer__socials">
            {siteInfo.socials.map((social) => (
              <a aria-label={`Follow CSS KNUST on ${social.platform}`} href={social.url} key={social.platform} rel="noreferrer" target="_blank">
                <SocialIcon platform={social.platform} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
