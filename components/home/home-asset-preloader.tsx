"use client";

import Image from "next/image";
import { useEffect } from "react";
import { homeImagePreloads } from "@/lib/home-assets";

export function HomeAssetPreloader({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active) return;

    document.documentElement.dataset.homeAssetsWarming = "true";
    window.dispatchEvent(new Event("css-home-assets-warming"));
    void import("./home-three-preloader").then(({ preloadHomeThreeAssets }) => {
      preloadHomeThreeAssets();
    });
  }, [active]);

  if (!active) return null;

  return (
    <div aria-hidden="true" className="home-asset-preloader">
      {homeImagePreloads.map((asset) => (
        <Image alt="" height={1} key={asset.src} loading="eager" sizes={asset.sizes} src={asset.src} width={1} />
      ))}
    </div>
  );
}
