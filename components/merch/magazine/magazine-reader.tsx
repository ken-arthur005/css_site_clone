"use client";

import { useEffect, useRef, useState } from "react";
import type { MagazineEdition, MagazineSession } from "@/lib/merch/magazine";

const PAGE_WIDTH = 1132, PAGE_HEIGHT = 1600;

/** The buyer's name, phone ending and order code across every page. */
function watermark(ctx: CanvasRenderingContext2D, width: number, height: number, text: string) {
  ctx.save();
  ctx.font = `600 ${Math.round(width / 36)}px system-ui, sans-serif`;
  ctx.fillStyle = "rgba(110, 110, 120, .17)";
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-Math.PI / 6);
  const step = ctx.measureText(text).width + width / 8;
  for (let y = -height, row = 0; y < height; y += width / 6, row++) {
    for (let x = -width * 1.2 + (row % 2) * step / 2; x < width * 1.2; x += step) ctx.fillText(text, x, y);
  }
  ctx.restore();
}

async function drawPage(canvas: HTMLCanvasElement, session: MagazineSession, edition: MagazineEdition, page: number) {
  const response = await fetch(`/api/merch/magazine/page/${edition}/${page}?t=${encodeURIComponent(session.token)}`);
  if (!response.ok) throw new Error(response.status === 403 ? "expired" : "page");
  const bitmap = await createImageBitmap(await response.blob());
  canvas.width = bitmap.width; canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close?.();
  watermark(ctx, canvas.width, canvas.height, session.watermark);
}

/**
 * The magazine, one watermarked canvas per page, loaded as it nears the screen.
 * Saving, copying and printing are blocked, and the pages are covered whenever
 * the reader loses focus (app switcher, screenshot tools). Determined people can
 * still photograph a screen; the watermark names whose copy it was.
 */
export function MagazineReader({ session, onClose, onExpired }: { session: MagazineSession; onClose: () => void; onExpired: () => void }) {
  const [edition, setEdition] = useState<MagazineEdition>(session.editions[0].id);
  const [shielded, setShielded] = useState(false);
  const pages = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const info = session.editions.find((entry) => entry.id === edition) ?? session.editions[0];

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    return () => { document.body.style.overflow = overflow; previous?.focus?.(); };
  }, []);

  useEffect(() => {
    const box = pages.current;
    if (!box) return;
    box.scrollTop = 0;
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      const canvas = entry.target as HTMLCanvasElement;
      if (!entry.isIntersecting || canvas.dataset.done) return;
      canvas.dataset.done = "1";
      observer.unobserve(canvas);
      drawPage(canvas, session, info.id, Number(canvas.dataset.page)).catch((failure) => {
        if (failure instanceof Error && failure.message === "expired") { onExpired(); return; }
        delete canvas.dataset.done;
        window.setTimeout(() => observer.observe(canvas), 3000);
      });
    }), { root: box, rootMargin: "1600px 0px" });
    box.querySelectorAll("canvas").forEach((canvas) => observer.observe(canvas));
    return () => observer.disconnect();
  }, [session, info.id, onExpired]);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const block = (event: Event) => event.preventDefault();
    const events = ["contextmenu", "dragstart", "selectstart", "copy"] as const;
    events.forEach((type) => element.addEventListener(type, block));
    const keydown = (event: KeyboardEvent) => {
      const key = (event.key || "").toLowerCase();
      if (key === "escape") { onClose(); return; }
      if ((event.ctrlKey || event.metaKey) && ["s", "p", "c", "u"].includes(key)) event.preventDefault();
      if (key === "printscreen" || (event.metaKey && event.shiftKey)) setShielded(true);
    };
    const keyup = (event: KeyboardEvent) => {
      if ((event.key || "").toLowerCase() !== "printscreen") return;
      setShielded(true);
      void navigator.clipboard?.writeText("").catch(() => {});
    };
    const cover = () => setShielded(true);
    const hidden = () => { if (document.hidden) setShielded(true); };
    document.addEventListener("keydown", keydown);
    document.addEventListener("keyup", keyup);
    window.addEventListener("blur", cover);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      events.forEach((type) => element.removeEventListener(type, block));
      document.removeEventListener("keydown", keydown);
      document.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", cover);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [onClose]);

  return <div className="merch-mag-reader" ref={dialog} role="dialog" aria-modal="true" aria-label="Magazine reader" data-lenis-prevent>
    <div className="merch-mag-reader__bar">
      {session.editions.length > 1 && <div className="merch-mag-reader__tabs" role="group" aria-label="Edition">
        {session.editions.map((entry) => <button key={entry.id} type="button" aria-pressed={entry.id === edition} onClick={() => setEdition(entry.id)}>{entry.name}</button>)}
      </div>}
      <span className="merch-mag-reader__who">{session.watermark}</span>
      <button type="button" className="merch-mag-reader__close" ref={closeButton} onClick={onClose}>Close</button>
    </div>
    <div className="merch-mag-reader__pages" ref={pages} key={info.id}>
      {Array.from({ length: info.pages }, (_, index) => <canvas key={index} width={PAGE_WIDTH} height={PAGE_HEIGHT} data-page={index + 1} aria-label={`${info.name}, page ${index + 1} of ${info.pages}`} role="img" />)}
    </div>
    {shielded && <button type="button" className="merch-mag-reader__shield" onClick={() => setShielded(false)}>Tap to keep reading</button>}
  </div>;
}
