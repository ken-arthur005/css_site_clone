"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { TransitionLink } from "@/components/transitions/transition-link";
import { useSmoothScroll } from "@/components/providers/smooth-scroll-provider";

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
  const hasScrolled = useSyncExternalStore(subscribeToScroll, getScrollSnapshot, getServerScrollSnapshot);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef(true);

  const closeMenu = (returnFocus = true) => {
    returnFocusRef.current = returnFocus;
    setIsOpen(false);
  };

  const isHome = pathname === "/";

  useEffect(() => {
    setScrollLocked(isOpen);
    return () => setScrollLocked(false);
  }, [isOpen, setScrollLocked]);

  useEffect(() => {
    if (!isOpen) {
      if (returnFocusRef.current) {
        triggerRef.current?.focus();
      }
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${scrollbarWidth}px`;

    const firstFocusable = menuRef.current?.querySelector<HTMLElement>(
      "a[href], button:not([disabled])",
    );
    firstFocusable?.focus();

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
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

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
          onClick={() => (isOpen ? closeMenu() : setIsOpen(true))}
          type="button"
        >
          <span>{isOpen ? "CLOSE" : "MENU"}</span>
          <span aria-hidden="true" className="menu-trigger__icon">
            <i />
            <i />
          </span>
        </button>
      </header>

      {isOpen && (
        <div
          ref={menuRef}
          aria-label="Site navigation"
          aria-modal="true"
          className="fullscreen-menu"
          id="site-menu"
          role="dialog"
        >
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
