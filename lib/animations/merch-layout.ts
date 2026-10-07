export const MERCH_LAYOUT_EVENT = "cssknust:merch-layout";
export const MERCH_TYPE_EVENT = "cssknust:merch-type";

export function getMerchStackHeight(): number {
  return (document.querySelector(".site-header")?.getBoundingClientRect().height ?? 72) +
    (document.querySelector(".merch-index")?.getBoundingClientRect().height ?? 56);
}

export function subscribeMerchLayout(listener: () => void) {
  window.addEventListener("resize", listener);
  window.addEventListener(MERCH_LAYOUT_EVENT, listener);
  const media = window.matchMedia("(min-width: 1024px) and (pointer: fine)");
  media.addEventListener("change", listener);
  return () => {
    window.removeEventListener("resize", listener);
    window.removeEventListener(MERCH_LAYOUT_EVENT, listener);
    media.removeEventListener("change", listener);
  };
}

export function canPinMerchTour(): boolean {
  if (!window.matchMedia("(min-width: 1024px) and (pointer: fine)").matches) return false;
  const fontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
  return innerHeight - getMerchStackHeight() >= fontSize * 32;
}
