"use client";

import { useEffect, useRef, useState } from "react";
import type { AboutChapter } from "@/types/about";

export function AboutChapters({ chapters }: { chapters: readonly AboutChapter[] }) {
  const [active, setActive] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const label = chapters.find((chapter) => chapter.id === active);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const threshold = window.innerHeight * 0.36;
      let current = "";
      for (const chapter of chapters) {
        const element = document.getElementById(chapter.id);
        if (element && element.getBoundingClientRect().top <= threshold) current = chapter.id;
      }
      setActive(current);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [chapters]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div className="about-chapters" ref={rootRef} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      <div className="about-chapters__bar">
        <a className="about-chapters__identity" href="#about-top" aria-label="Inside CSS: back to the opening">INSIDE CSS<span aria-hidden="true">↗</span></a>
        <nav className="about-chapters__desktop" aria-label="About chapters">
          {chapters.map((chapter) => <a key={chapter.id} href={`#${chapter.id}`} aria-current={active === chapter.id ? "location" : undefined}><span>{chapter.number}</span>{chapter.label}</a>)}
        </nav>
        <span className="about-chapters__current">{label ? `${label.number} / ${label.label}` : "The story starts here"}</span>
        <button className="about-chapters__trigger" type="button" ref={triggerRef} aria-expanded={open} aria-controls="about-chapter-index" onClick={() => setOpen(!open)}>Chapters <span aria-hidden="true">{open ? "−" : "+"}</span></button>
        <noscript>
          <style>{".about-chapters__trigger { display: none; }"}</style>
          <details className="about-chapters__nojs">
            <summary>Chapters +</summary>
            <nav className="about-chapters__index" aria-label="Chapter index">
              {chapters.map((chapter) => <a key={chapter.id} href={`#${chapter.id}`}><span>{chapter.number}</span><strong>{chapter.label}</strong><span aria-hidden="true">↗</span></a>)}
            </nav>
          </details>
        </noscript>
      </div>
        <nav className="about-chapters__index" id="about-chapter-index" hidden={!open} aria-label="All About chapters" data-lenis-prevent>
          {chapters.map((chapter) => <a key={chapter.id} href={`#${chapter.id}`} onClick={() => setOpen(false)} aria-current={active === chapter.id ? "location" : undefined}><span className="about-label">{chapter.number}</span><span><strong>{chapter.label}</strong><small>{chapter.description}</small></span><span aria-hidden="true">↗</span></a>)}
          <div className="about-chapters__shortcuts"><a href="#faculty" onClick={() => setOpen(false)}>Faculty ↗</a><a href="#student-life" onClick={() => setOpen(false)}>Student life ↗</a><a href="#champions" onClick={() => setOpen(false)}>Champions ↗</a><a href="#find-us" onClick={() => setOpen(false)}>Find us ↗</a></div>
        </nav>
    </div>
  );
}
