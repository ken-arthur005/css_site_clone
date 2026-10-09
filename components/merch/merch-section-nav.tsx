"use client";

import { useEffect, useRef, type MouseEvent } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useSmoothScroll } from "@/components/providers/smooth-scroll-provider";
import { getMerchStackHeight, MERCH_LAYOUT_EVENT } from "@/lib/animations/merch-layout";
import { MerchOrderLink } from "./merch-showcase";

const links = [
  { id: "shop", label: "Shop" }, { id: "pink-october", label: "Pink October" },
  { id: "lookbook", label: "Lookbook" }, { id: "merch-readme", label: "README" },
];

export function MerchSectionNav() {
  const nav = useRef<HTMLElement>(null);
  const { scrollToElement } = useSmoothScroll();

  useEffect(() => {
    const element = nav.current, page = element?.closest<HTMLElement>(".merch-page");
    const header = document.querySelector<HTMLElement>(".site-header");
    if (!element || !page || !header) return;
    let frame = 0, mounted = true;
    let previous = "";
    const measure = () => {
      frame = 0;
      const headerHeight = header.getBoundingClientRect().height;
      const navHeight = element.getBoundingClientRect().height;
      const sizes = `${headerHeight}:${navHeight}`;
      if (sizes === previous) return;
      previous = sizes;
      page.style.setProperty("--merch-header-height", `${headerHeight}px`);
      page.style.setProperty("--merch-index-height", `${navHeight}px`);
      page.style.setProperty("--merch-stack-height", `${headerHeight + navHeight}px`);
      window.dispatchEvent(new Event(MERCH_LAYOUT_EVENT));
      ScrollTrigger.refresh();
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    const observer = new ResizeObserver(schedule);
    observer.observe(header); observer.observe(element);
    measure();
    // URL/hash history alignment belongs to the app coordinator; reapplying an
    // anchor here would overwrite a saved Back/Forward position in that chapter.
    document.fonts.ready.then(() => {
      if (!mounted) return;
      schedule();
    });
    return () => {
      mounted = false; observer.disconnect(); cancelAnimationFrame(frame);
      page.style.removeProperty("--merch-header-height"); page.style.removeProperty("--merch-index-height"); page.style.removeProperty("--merch-stack-height");
    };
  }, [scrollToElement]);

  function navigateSection(event: MouseEvent<HTMLAnchorElement>, id: string) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    if (location.hash !== `#${id}`) history.pushState({ ...history.state }, "", `#${id}`);
    scrollToElement(target, { offset: -getMerchStackHeight() - 16 });
    const heading = target.querySelector<HTMLElement>("h2") ?? target;
    const previousIndex = heading.getAttribute("tabindex");
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
    heading.addEventListener("blur", () => {
      if (previousIndex === null) heading.removeAttribute("tabindex"); else heading.setAttribute("tabindex", previousIndex);
    }, { once: true });
  }

  return <div className="merch-index-space">
    <nav className="merch-index" aria-label="Merch sections" ref={nav} data-lenis-prevent>
      {links.map(({ id, label }) => <a key={id} href={`#${id}`} onClick={(event) => navigateSection(event, id)}>{label}</a>)}
      <MerchOrderLink className="merch-index__order">Start an order ↗</MerchOrderLink>
    </nav>
  </div>;
}
