"use client";

import { useEffect, useRef, useState } from "react";
import { useNavigationState } from "@/components/providers/navigation-state-provider";

export function AboutFilm({ src, poster, title }: { src: string; poster: string; title: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  const [failed, setFailed] = useState(false);
  const { isMenuActive } = useNavigationState();
  const menuActiveRef = useRef(false);
  const syncPlaybackRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const video = videoRef.current;
    if (!root || !video) return;

    let visible = false;
    let userPaused = false;
    let internalPause = false;
    let playPending = false;
    let disposed = false;
    const allowed = () => visible && !document.hidden && !menuActiveRef.current;
    const pauseInternally = () => {
      if (video.paused) return;
      internalPause = true;
      video.pause();
    };
    const syncPlayback = () => {
      if (disposed) return;
      if (!allowed()) {
        pauseInternally();
        return;
      }
      if (userPaused || playPending || !video.paused || video.readyState < 2 || !video.getAttribute("src")) return;
      playPending = true;
      // Aborted play requests and autoplay-policy rejection are not corrupt media.
      // The native controls remain usable if the browser requires a gesture.
      void video.play().catch(() => {}).finally(() => { playPending = false; });
    };
    const onPlay = () => {
      userPaused = false;
      if (!allowed()) pauseInternally();
    };
    const onPause = () => {
      if (internalPause) {
        internalPause = false;
      } else if (allowed()) {
        userPaused = true;
      }
    };

    video.defaultMuted = true;
    video.muted = true;
    syncPlaybackRef.current = syncPlayback;
    const loading = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setNear(true);
    }, { rootMargin: "300px" });
    loading.observe(root);
    // Observe the actual player, not its caption. Separate entry/exit thresholds
    // prevent edge flicker from turning continuous playback into repeated pauses.
    const visibility = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.12) visible = true;
      else if (!entry.isIntersecting || entry.intersectionRatio <= 0.02) visible = false;
      syncPlayback();
    }, { threshold: [0, 0.02, 0.12] });
    visibility.observe(video);
    video.addEventListener("canplay", syncPlayback);
    video.addEventListener("loadeddata", syncPlayback);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    document.addEventListener("visibilitychange", syncPlayback);

    return () => {
      disposed = true;
      syncPlaybackRef.current = null;
      loading.disconnect();
      visibility.disconnect();
      video.removeEventListener("canplay", syncPlayback);
      video.removeEventListener("loadeddata", syncPlayback);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      document.removeEventListener("visibilitychange", syncPlayback);
      video.pause();
    };
  }, [src]);

  useEffect(() => {
    menuActiveRef.current = isMenuActive;
    syncPlaybackRef.current?.();
  }, [isMenuActive]);

  return (
    <div className="about-film" ref={rootRef}>
      {failed ? <div className="about-film__fallback"><p>The film couldn’t load. The story’s still here.</p><a href={src}>Open the CSS Games film ↗</a></div> : (
        <video ref={videoRef} aria-label={title} autoPlay loop controls muted playsInline poster={poster} preload={near ? "auto" : "none"} src={near ? src : undefined} onError={() => setFailed(true)} />
      )}
      <noscript><p><a href={src}>Open the CSS Games film ↗</a></p></noscript>
      <div className="about-film__caption"><span className="about-label">CSS Games / The post-event film</span><span>00:51 <span aria-hidden="true">↗</span></span></div>
    </div>
  );
}
