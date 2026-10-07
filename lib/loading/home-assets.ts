import type { BackgroundRouteAssets, HomeLoadingPlan, LoadingImage } from "@/types/loading";
import { markHomeAssetFallback } from "./asset-fallback";

export const HOME_ASSET_TIMEOUT = 12_000;
type ResourceStatus = "ready" | "failed";

// Suspense warms the exact useGLTF/useLoader caches the visible scenes consume.
export class HomeResourceGate {
  private entries = new Map<string, { promise: Promise<ResourceStatus>; resolve: (status: ResourceStatus) => void }>();

  constructor(sources: readonly string[]) {
    sources.forEach((src) => {
      let resolve!: (status: ResourceStatus) => void;
      const promise = new Promise<ResourceStatus>((settle) => { resolve = settle; });
      this.entries.set(src, { promise, resolve });
    });
  }

  wait(src: string) { return this.entries.get(src)!.promise; }
  settle = (src: string, status: ResourceStatus) => { this.entries.get(src)?.resolve(status); };
}

function waitForImage(img: HTMLImageElement, signal: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    let ended = false;
    const clean = () => {
      img.removeEventListener("load", loaded);
      img.removeEventListener("error", failed);
      signal.removeEventListener("abort", aborted);
    };
    const finish = (ready: boolean) => {
      if (ended) return;
      ended = true;
      clean();
      resolve(ready);
    };
    const loaded = () => {
      void img.decode().then(() => finish(true), () => finish(img.naturalWidth > 0));
    };
    const failed = () => finish(false);
    const aborted = () => finish(false);
    if (signal.aborted) { finish(false); return; }
    img.addEventListener("load", loaded);
    img.addEventListener("error", failed);
    signal.addEventListener("abort", aborted, { once: true });
    if (img.complete) {
      if (img.naturalWidth) loaded();
      else if (img.currentSrc || img.src) failed();
    }
  });
}

function makeImage(spec: LoadingImage, priority: "high" | "low") {
  const img = new Image();
  img.decoding = "async";
  img.fetchPriority = priority;
  if (spec.sizes) img.sizes = spec.sizes;
  if (spec.srcSet) img.srcset = spec.srcSet;
  img.src = spec.src;
  return img;
}

function imageFallback(img: HTMLImageElement) {
  img.dataset.loadingFallback = "true";
  // A slow photo may finish after the screen releases; restore it then.
  if (!img.complete) img.addEventListener("load", () => delete img.dataset.loadingFallback, { once: true });
}

export async function prepareHomepageAssets(plan: HomeLoadingPlan, gate: HomeResourceGate, signal: AbortSignal) {
  const pending = new Map<string, () => void>();
  const failed = new Set<string>();
  const track = (id: string, work: Promise<boolean>, fallback: () => void = () => {}) => {
    pending.set(id, fallback);
    return work.then((ready) => {
      if (signal.aborted) return;
      if (!ready) { failed.add(id); fallback(); }
      pending.delete(id);
    });
  };
  const renderedImages = Array.from(document.querySelectorAll<HTMLImageElement>("main img, .site-header img, .site-footer img"));
  const work = renderedImages.map((img, index) => {
    img.loading = "eager";
    return track(`image:${index}:${img.src}`, waitForImage(img, signal), () => imageFallback(img));
  });
  plan.extraImages.forEach((spec, index) => {
    work.push(track(`extra:${index}:${spec.src}`, waitForImage(makeImage(spec, "high"), signal)));
  });
  plan.resources.forEach(({ src }) => {
    work.push(track(src, gate.wait(src).then((status) => status === "ready"), () => markHomeAssetFallback(src)));
  });
  work.push(track("fonts", document.fonts.ready.then(() => true, () => false)));
  // Prepare deferred scene code, without mounting offscreen WebGL canvases.
  work.push(track("scene-code", Promise.all([
    import("@/components/home/about-model-scene"),
    import("@/components/merch/merch-shirt-viewer"),
  ]).then(() => true, () => false), () => {
    plan.resources.filter(({ kind }) => kind === "model").forEach(({ src }) => markHomeAssetFallback(src));
  }));

  let timer = 0;
  let abort = () => {};
  const deadline = new Promise<"timeout" | "aborted">((resolve) => {
    timer = window.setTimeout(() => resolve("timeout"), HOME_ASSET_TIMEOUT);
    abort = () => resolve("aborted");
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
  });
  const reason = await Promise.race([Promise.all(work).then(() => "ready" as const), deadline]);
  window.clearTimeout(timer);
  signal.removeEventListener("abort", abort);
  if (reason === "timeout") pending.forEach((fallback) => fallback());
  return { reason, failed: [...failed], pending: [...pending.keys()] };
}

function idle(signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted) { resolve(); return; }
    const done = () => { signal.removeEventListener("abort", abort); resolve(); };
    const handle = window.setTimeout(done, 80);
    const abort = () => { window.clearTimeout(handle); done(); };
    signal.addEventListener("abort", abort, { once: true });
  });
}

export async function warmBackgroundRoutes(routes: readonly BackgroundRouteAssets[], prefetch: (href: string) => void, signal: AbortSignal) {
  const seen = new Set<string>();
  const images: LoadingImage[] = [];
  const files: string[] = [];
  for (const route of routes) {
    await idle(signal);
    if (signal.aborted) return;
    prefetch(route.href);
    route.images.forEach((spec) => {
      const key = `${spec.srcSet ?? spec.src}|${spec.sizes ?? ""}`;
      if (seen.has(key)) return;
      seen.add(key);
      images.push(spec);
    });
    files.push(...(route.files ?? []));
  }
  // Two low-priority workers leave capacity for live interaction/navigation.
  let index = 0;
  const worker = async () => {
    while (index < images.length && !signal.aborted) {
      const spec = images[index++];
      await idle(signal);
      if (signal.aborted) return;
      const img = makeImage(spec, "low");
      const request = new AbortController();
      const abort = () => request.abort();
      const timer = window.setTimeout(abort, 8000);
      signal.addEventListener("abort", abort, { once: true });
      await waitForImage(img, request.signal);
      window.clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      if (request.signal.aborted) { img.srcset = ""; img.removeAttribute("src"); }
    }
  };
  await Promise.all([worker(), worker()]);
  for (const src of new Set(files)) {
    if (signal.aborted) return;
    try {
      const response = await fetch(src, { signal, priority: "low" });
      // Drain into the HTTP cache without retaining a whole video in JS memory.
      const reader = response.body?.getReader();
      if (reader) while (!(await reader.read()).done) { /* cache the stream */ }
    } catch { /* Background warming never blocks a destination. */ }
  }
}
