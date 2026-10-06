"use client";

import { useEffect, useRef, useState } from "react";
import { useNavigationState } from "@/components/providers/navigation-state-provider";

export function AboutFilm({ src, poster, title }: { src: string; poster: string; title: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  const [failed, setFailed] = useState(false);
  const { isMenuActive } = useNavigationState();

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setNear(true);
    }, { rootMargin: "200px" });
    observer.observe(root);
    const visibility = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) videoRef.current?.pause();
    });
    visibility.observe(root);
    const pauseHidden = () => { if (document.hidden) videoRef.current?.pause(); };
    document.addEventListener("visibilitychange", pauseHidden);
    return () => { observer.disconnect(); visibility.disconnect(); document.removeEventListener("visibilitychange", pauseHidden); };
  }, []);

  useEffect(() => { if (isMenuActive) videoRef.current?.pause(); }, [isMenuActive]);

  return (
    <div className="about-film" ref={rootRef}>
      {failed ? <div className="about-film__fallback"><p>The film couldn’t load. The story’s still here.</p><a href={src}>Open the CSS Games film ↗</a></div> : (
        <video ref={videoRef} aria-label={title} controls muted playsInline poster={poster} preload={near ? "metadata" : "none"} src={near ? src : undefined} onError={() => setFailed(true)} />
      )}
      <noscript><p><a href={src}>Open the CSS Games film ↗</a></p></noscript>
      <div className="about-film__caption"><span className="about-label">CSS Games / The post-event film</span><span>00:51 <span aria-hidden="true">↗</span></span></div>
    </div>
  );
}
