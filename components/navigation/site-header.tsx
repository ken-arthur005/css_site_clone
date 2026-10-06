"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { TransitionLink } from "@/components/transitions/transition-link";
import { useRouteTransition } from "@/components/transitions/route-transition-provider";
import { useSmoothScroll } from "@/components/providers/smooth-scroll-provider";
import { useNavigationState } from "@/components/providers/navigation-state-provider";

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

function getFocusableControls(menu: HTMLElement) {
  return Array.from(menu.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )).filter((element) => element.tabIndex >= 0 && !element.closest("[inert]") && element.getClientRects().length > 0 && getComputedStyle(element).visibility === "visible");
}

export function SiteHeader() {
  const pathname = usePathname();
  const { setScrollLocked } = useSmoothScroll();
  const { isMenuActive, setMenuActive } = useNavigationState();
  const { isTransitioning } = useRouteTransition();
  const [isOpen, setIsOpen] = useState(false);
  const hasScrolled = useSyncExternalStore(subscribeToScroll, getScrollSnapshot, getServerScrollSnapshot);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef(true);
  const menuWasMountedRef = useRef(false);
  const menuReadyRef = useRef(false);
  const pendingNavigationRef = useRef<{ from: string; href: string } | null>(null);
  const previousPathnameRef = useRef(pathname);
  const menuScrollRef = useRef<{ x: number; y: number } | null>(null);

  const closeMenu = useCallback((returnFocus = true) => {
    returnFocusRef.current = returnFocus;
    menuReadyRef.current = false;
    setIsOpen(false);
  }, []);

  const openMenu = () => {
    returnFocusRef.current = true;
    pendingNavigationRef.current = null;
    menuScrollRef.current = { x: window.scrollX, y: window.scrollY };
    setMenuActive(true);
    setIsOpen(true);
  };

  const isHome = pathname === "/";

  useEffect(() => {
    if (!isMenuActive) {
      if (menuWasMountedRef.current && returnFocusRef.current) {
        triggerRef.current?.focus({ preventScroll: true });
      }
      menuWasMountedRef.current = false;
      return;
    }

    menuWasMountedRef.current = true;
    setScrollLocked(true);

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollPosition = menuScrollRef.current;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${scrollbarWidth}px`;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu(!pendingNavigationRef.current);
        return;
      }

      if (event.key !== "Tab" || !menuRef.current) {
        return;
      }

      const menu = menuRef.current;
      const focusable = menuReadyRef.current ? getFocusableControls(menu) : [];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!first || !last) {
        event.preventDefault();
        menu.focus({ preventScroll: true });
        return;
      }

      if (!menu.contains(document.activeElement) || document.activeElement === menu) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus({ preventScroll: true });
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    const containFocus = (event: FocusEvent) => {
      const menu = menuRef.current;
      if (!menu || !(event.target instanceof Node) || menu.contains(event.target)) return;
      const target = menuReadyRef.current ? menu.querySelector<HTMLElement>(".fullscreen-menu__link") : menu;
      (target ?? menu).focus({ preventScroll: true });
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", containFocus);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      if (returnFocusRef.current && scrollPosition) {
        window.scrollTo({ left: scrollPosition.x, top: scrollPosition.y, behavior: "instant" });
      }
      setScrollLocked(false);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", containFocus);
    };
  }, [isMenuActive, setScrollLocked, closeMenu]);

  useEffect(() => {
    const previousPathname = previousPathnameRef.current;
    previousPathnameRef.current = pathname;
    if (pathname !== previousPathname && isMenuActive) {
      pendingNavigationRef.current ??= { from: previousPathname, href: pathname };
      closeMenu(false);
    }

    const pending = pendingNavigationRef.current;
    if (!pending || isMenuActive || isTransitioning) return;

    if (pathname === pending.from) {
      // Release focus after the transition's slow-route fail-safe, but keep the
      // destination pending so a later successful commit can receive focus.
      triggerRef.current?.focus({ preventScroll: true });
      return;
    }

    pendingNavigationRef.current = null;
    const main = document.querySelector<HTMLElement>("main");
    const target = main?.querySelector<HTMLElement>("h1") ?? main;
    if (!target) {
      triggerRef.current?.focus({ preventScroll: true });
      return;
    }

    const previousTabIndex = target.getAttribute("tabindex");
    target.tabIndex = -1;
    target.focus({ preventScroll: true });
    const restoreTabIndex = () => {
      if (previousTabIndex === null) target.removeAttribute("tabindex");
      else target.setAttribute("tabindex", previousTabIndex);
    };
    target.addEventListener("blur", restoreTabIndex, { once: true });
    return () => {
      target.removeEventListener("blur", restoreTabIndex);
      restoreTabIndex();
    };
  }, [pathname, isMenuActive, isTransitioning, closeMenu]);

  useGSAP((gsapContext) => {
    // Release previous tweens without resetting an interrupted reveal. The hook
    // still reverts the current scoped context on unmount.
    gsapContext.kill(false);
    menuReadyRef.current = false;
    const menu = menuRef.current;
    if (!menu) return;

    const topLine = menu.querySelector<HTMLElement>(".fullscreen-menu__topline");
    const links = Array.from(menu.querySelectorAll<HTMLElement>(".fullscreen-menu__link"));
    const context = menu.querySelector<HTMLElement>(".fullscreen-menu__context");
    const content = [topLine, ...links, context].filter((element): element is HTMLElement => element !== null);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const timeline = gsap.timeline();

    if (isOpen) {
      gsap.set(menu, { autoAlpha: 1, clipPath: "polygon(0 0, 0 0, 0 100%, 0 100%)" });
      gsap.set(content, { autoAlpha: 0, y: 28 });
      // A visible dialog shell holds focus while its controls are being revealed.
      menu.focus({ preventScroll: true });
      timeline
        .to(menu, { clipPath: "polygon(0 0, 100% 0, 94% 100%, 0 100%)", duration: reduceMotion ? 0 : 0.58, ease: "power4.inOut" })
        .to(topLine, { autoAlpha: 1, y: 0, duration: reduceMotion ? 0 : 0.28, ease: "power3.out" }, reduceMotion ? 0 : "<0.12")
        .to(links, { autoAlpha: 1, y: 0, duration: reduceMotion ? 0 : 0.42, ease: "power3.out", stagger: reduceMotion ? 0 : 0.055 }, reduceMotion ? 0 : "<0.05")
        .to(context, { autoAlpha: 1, y: 0, duration: reduceMotion ? 0 : 0.3, ease: "power3.out" }, reduceMotion ? 0 : "<0.12")
        .set(menu, { clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)" })
        .call(() => {
          menuReadyRef.current = true;
          if (document.activeElement === menu || !menu.contains(document.activeElement)) {
            links[0]?.focus({ preventScroll: true });
          }
        });
    } else {
      menu.focus({ preventScroll: true });
      timeline
        .to(content, { autoAlpha: 0, y: -18, duration: reduceMotion ? 0 : 0.18, ease: "power2.in" })
        .to(menu, { clipPath: "polygon(0 0, 0 0, 0 100%, 0 100%)", duration: reduceMotion ? 0 : 0.4, ease: "power4.inOut" }, reduceMotion ? 0 : "<0.04")
        .set(menu, { autoAlpha: 0 })
        .call(() => setMenuActive(false));
    }

    return () => timeline.kill();
  }, { scope: menuRef, dependencies: [isMenuActive, isOpen], revertOnUpdate: false });

  return (
    <>
      <header
        className={`site-header${isHome ? " site-header--hero" : ""}`}
        data-scrolled={hasScrolled}
        inert={isMenuActive}
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
          aria-expanded={isMenuActive}
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

      {isMenuActive && (
        <div
          ref={menuRef}
          aria-label="Site navigation"
          aria-modal="true"
          className="fullscreen-menu"
          id="site-menu"
          role="dialog"
          tabIndex={-1}
          data-lenis-prevent
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
                  onClick={(event) => {
                    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || isTransitioning) return;
                    if (item.href !== pathname) pendingNavigationRef.current = { from: pathname, href: item.href };
                    closeMenu(item.href === pathname);
                  }}
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
