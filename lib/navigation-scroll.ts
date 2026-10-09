export const HISTORY_ENTRY_KEY = "cssTransitionEntry";
const POSITION_STORAGE_KEY = "css-scroll-positions";

export type ScrollPosition = { x: number; y: number };

// Run before page markup and hydration, so the browser cannot restore a reload
// midway down the page before the navigation coordinator takes over.
export const NAVIGATION_SCROLL_BOOT_SCRIPT = `(() => {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  const navigation = performance.getEntriesByType("navigation")[0];
  if (navigation?.type !== "back_forward" && !location.hash) {
    window.scrollTo({ left: 0, top: 0, behavior: "instant" });
  }
})();`;

export function readScrollPositions(): Map<string, ScrollPosition> {
  try {
    const entries: unknown = JSON.parse(sessionStorage.getItem(POSITION_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(entries)) return new Map();
    return new Map(entries.filter((entry): entry is [string, ScrollPosition] => {
      if (!Array.isArray(entry) || typeof entry[0] !== "string") return false;
      const position = entry[1];
      return position && Number.isFinite(position.x) && Number.isFinite(position.y)
        && position.x >= 0 && position.y >= 0;
    }));
  } catch {
    return new Map();
  }
}

export function saveScrollPositions(positions: Map<string, ScrollPosition>) {
  try {
    // Keep per-entry positions across reloads/full-document history navigation,
    // with bounded session storage and no writes on every animation frame.
    sessionStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify([...positions].slice(-100)));
  } catch {
    // In-memory restoration still works when session storage is unavailable.
  }
}

export function getHashTarget(): HTMLElement | null {
  let id: string;
  try { id = decodeURIComponent(window.location.hash.slice(1)); }
  catch { return null; }
  if (!id || id === "top") return null;
  const target = document.getElementById(id) ?? document.getElementsByName(id)[0];
  return target instanceof HTMLElement ? target : null;
}
