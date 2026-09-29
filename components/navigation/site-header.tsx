"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { TransitionLink } from "@/components/transitions/transition-link";
import { useSmoothScroll } from "@/components/providers/smooth-scroll-provider";

gsap.registerPlugin(useGSAP);

const menuItems = [
  { href: "/about", label: "ABOUT", number: "01" },
  { href: "/executives", label: "EXECUTIVES", number: "02" },
  { href: "/events", label: "EVENTS", number: "03" },
  { href: "/merch", label: "MERCH", number: "04" },
];

function subscribeToScroll(onStoreChange: () => void) {
  window.addEventListener("scroll", onStoreChange, { passive: true });
  return () => window.removeEventListener("scroll", onStoreChange);
}

function getScrollSnapshot() {
  return window.scrollY > 24;
}

function getServerScrollSnapshot() {
  return false;
}

export function SiteHeader() {
  const pathname = usePathname();
  const { setScrollLocked } = useSmoothScroll();
  const [isOpen, setIsOpen] = useState(false);
  const [isMenuMounted, setIsMenuMounted] = useState(false);
  const hasScrolled = useSyncExternalStore(subscribeToScroll, getScrollSnapshot, getServerScrollSnapshot);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef(true);
  const menuWasMountedRef = useRef(false);

  const closeMenu = (returnFocus = true) => {
    returnFocusRef.current = returnFocus;
    setIsOpen(false);
  };

  const openMenu = () => {
    returnFocusRef.current = true;
    setIsMenuMounted(true);
    setIsOpen(true);
  };

  const isHome = pathname === "/";

  useEffect(() => {
    if (!isMenuMounted) {
      if (menuWasMountedRef.current && returnFocusRef.current) {
        triggerRef.current?.focus();
      }
      menuWasMountedRef.current = false;
      return;
    }

    menuWasMountedRef.current = true;
    setScrollLocked(true);

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${scrollbarWidth}px`;

    const firstFocusable = menuRef.current?.querySelector<HTMLElement>(
      "a[href], button:not([disabled])",
    );
    const focusFrame = window.requestAnimationFrame(() => firstFocusable?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }

      if (event.key !== "Tab" || !menuRef.current) {
        return;
      }

      const focusable = Array.from(
        menuRef.current.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled])",
        ),
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!first || !last) {
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      setScrollLocked(false);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuMounted, setScrollLocked]);

  useGSAP(() => {
    const menu = menuRef.current;
    if (!menu) return;

    const wipe = menu.querySelector<HTMLElement>(".fullscreen-menu__wipe");
    const topLine = menu.querySelector<HTMLElement>(".fullscreen-menu__topline");
    const links = Array.from(menu.querySelectorAll<HTMLElement>(".fullscreen-menu__link"));
    const context = menu.querySelector<HTMLElement>(".fullscreen-menu__context");
    const content = [topLine, ...links, context].filter((element): element is HTMLElement => element !== null);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!wipe) return;

    const timeline = gsap.timeline();

    if (isOpen) {
      timeline
        .set(menu, { autoAlpha: 1 })
        .set(wipe, { xPercent: 0 })
        .set(content, { autoAlpha: 0, y: 28 })
        .to(wipe, { xPercent: -112, duration: reduceMotion ? 0 : 0.58, ease: "power4.inOut" })
        .to(topLine, { autoAlpha: 1, y: 0, duration: reduceMotion ? 0 : 0.28, ease: "power3.out" }, "<0.12")
        .to(links, { autoAlpha: 1, y: 0, duration: reduceMotion ? 0 : 0.42, ease: "power3.out", stagger: reduceMotion ? 0 : 0.055 }, "<0.05")
        .to(context, { autoAlpha: 1, y: 0, duration: reduceMotion ? 0 : 0.3, ease: "power3.out" }, "<0.12");
    } else {
      timeline
        .to(content, { autoAlpha: 0, y: -18, duration: reduceMotion ? 0 : 0.18, ease: "power2.in" })
        .to(wipe, { xPercent: 0, duration: reduceMotion ? 0 : 0.4, ease: "power4.inOut" }, "<0.04")
        .set(menu, { autoAlpha: 0 })
        .call(() => setIsMenuMounted(false));
    }

    return () => timeline.kill();
  }, { scope: menuRef, dependencies: [isMenuMounted, isOpen], revertOnUpdate: false });

  return (
    <>
      <header
        className={`site-header${isHome ? " site-header--hero" : ""}`}
        data-scrolled={hasScrolled}
      >
        <TransitionLink
          className="site-header__identity"
          href="/"
          transitionLabel="HOME"
        >
          <Image alt="" className="site-header__logo" height={22} priority src="/css_logo.svg" width={42} />
          <span>COMPUTER SCIENCE SOCIETY</span>
        </TransitionLink>
        <button
          ref={triggerRef}
          aria-controls="site-menu"
          aria-expanded={isOpen}
          className="menu-trigger"
          onClick={() => (isOpen ? closeMenu() : openMenu())}
          type="button"
        >
          <span>{isOpen ? "CLOSE" : "MENU"}</span>
          <span aria-hidden="true" className="menu-trigger__icon">
            <i />
            <i />
          </span>
        </button>
      </header>

      {isMenuMounted && (
        <div
          ref={menuRef}
          aria-label="Site navigation"
          aria-modal="true"
          className="fullscreen-menu"
          id="site-menu"
          role="dialog"
        >
          <div aria-hidden="true" className="fullscreen-menu__wipe" />
          <div className="fullscreen-menu__inner">
            <div className="fullscreen-menu__topline">
              <p className="eyebrow">Navigate</p>
              <button className="fullscreen-menu__close" onClick={() => closeMenu()} type="button">
                Close menu
              </button>
            </div>
            <nav aria-label="Primary" className="fullscreen-menu__nav">
              {menuItems.map((item) => (
                <TransitionLink
                  className="fullscreen-menu__link"
                  href={item.href}
                  key={item.href}
                  onClick={() => closeMenu(false)}
                  transitionLabel={item.label}
                >
                  <span className="fullscreen-menu__index">{item.number}</span>
                  <span>{item.label}</span>
                  <span aria-hidden="true" className="fullscreen-menu__arrow">
                    /&gt;
                  </span>
                </TransitionLink>
              ))}
            </nav>
            <div className="fullscreen-menu__context">
              <p className="eyebrow">Computer Science Society</p>
              <p>KNUST / College of Science / Kumasi, Ghana</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
